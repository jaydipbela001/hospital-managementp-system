import { Appointment } from "../../models/Appointment.js";
import { DoctorSchedule } from "../../models/DoctorSchedule.js";
import { User } from "../../models/User.js";
import { DoctorProfile } from "../../models/DoctorProfile.js";
import { ApiError } from "../../utils/ApiError.js";

// Generates next appointment code e.g. APT-2026-0001
const generateAppointmentCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `APT-${year}-`;
  const latest = await Appointment.findOne({ appointmentCode: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .select("appointmentCode");

  if (!latest) return `${prefix}0001`;
  const parts = latest.appointmentCode.split("-");
  const nextNum = parseInt(parts[2], 10) + 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
};

export const getAppointments = async (req, res, next) => {
  try {
    const { doctorId, patientId, status, date, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (doctorId) filter.doctorId = doctorId;
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;

    // Doctor can only see their own appointments unless Admin/Receptionist
    if (req.user.role === "DOCTOR") {
      filter.doctorId = req.user._id;
    }

    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      filter.startAt = { $gte: dayStart, $lte: dayEnd };
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate("patientId", "name patientCode phone gender bloodGroup")
        .populate("doctorId", "name email phone")
        .populate("departmentId", "name code")
        .sort({ startAt: 1 })
        .skip(skip)
        .limit(take),
      Appointment.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: appointments,
      meta: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getAvailableSlots = async (req, res, next) => {
  try {
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      throw new ApiError(400, "doctorId and date (YYYY-MM-DD) are required.");
    }

    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    const schedule = await DoctorSchedule.findOne({ doctorId });
    // Default 09:00 - 17:00 if no custom schedule is configured
    const availability = schedule?.weeklyAvailability?.find((w) => w.dayOfWeek === dayOfWeek) || {
      startTime: "09:00",
      endTime: "17:00",
    };

    const slotMinutes = schedule?.slotDurationMinutes || 30;

    // Check exception/leave
    const isException = schedule?.exceptions?.find((e) => e.date === date && !e.isAvailable);
    if (isException) {
      return res.status(200).json({ success: true, data: [], message: isException.reason || "Doctor unavailable" });
    }

    // Generate intervals
    const [startH, startM] = availability.startTime.split(":").map(Number);
    const [endH, endM] = availability.endTime.split(":").map(Number);

    const dayStart = new Date(date);
    dayStart.setHours(startH, startM, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(endH, endM, 0, 0);

    // Fetch existing booked appointments for that doctor on this day
    const booked = await Appointment.find({
      doctorId,
      status: { $in: ["SCHEDULED", "CONFIRMED"] },
      startAt: { $gte: new Date(new Date(date).setHours(0, 0, 0, 0)), $lte: new Date(new Date(date).setHours(23, 59, 59, 999)) },
    });

    const bookedStarts = new Set(booked.map((b) => new Date(b.startAt).getTime()));

    const slots = [];
    let current = new Date(dayStart);

    while (current < dayEnd) {
      const slotEnd = new Date(current.getTime() + slotMinutes * 60000);
      if (slotEnd > dayEnd) break;

      const isBooked = bookedStarts.has(current.getTime());
      slots.push({
        startAt: new Date(current),
        endAt: slotEnd,
        isAvailable: !isBooked,
      });

      current = slotEnd;
    }

    res.status(200).json({ success: true, data: slots });
  } catch (err) {
    next(err);
  }
};

export const createAppointment = async (req, res, next) => {
  try {
    const { patientId, doctorId, departmentId, startAt, reason } = req.body;

    if (!patientId || !doctorId || !startAt) {
      throw new ApiError(400, "patientId, doctorId, and startAt are required.");
    }

    const startDate = new Date(startAt);
    const schedule = await DoctorSchedule.findOne({ doctorId });
    const slotMinutes = schedule?.slotDurationMinutes || 30;
    const endDate = new Date(startDate.getTime() + slotMinutes * 60000);

    // Prevent double booking
    const conflict = await Appointment.findOne({
      doctorId,
      status: { $in: ["SCHEDULED", "CONFIRMED"] },
      startAt: startDate,
    });

    if (conflict) {
      throw new ApiError(409, "Doctor is already booked for this time slot.");
    }

    // Get doctor fee & department
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "DOCTOR") {
      throw new ApiError(404, "Doctor not found.");
    }

    const doctorProfile = await DoctorProfile.findOne({ userId: doctorId });
    const finalDepartmentId = departmentId || doctor.departmentId || doctorProfile?.departmentId || null;
    const consultationFee = doctorProfile?.consultationFee || 0;

    const appointmentCode = await generateAppointmentCode();

    const appointment = await Appointment.create({
      appointmentCode,
      patientId,
      doctorId,
      departmentId: finalDepartmentId,
      startAt: startDate,
      endAt: endDate,
      reason: reason || "",
      consultationFee,
      createdBy: req.user._id,
      status: "CONFIRMED",
    });

    const populated = await Appointment.findById(appointment._id)
      .populate("patientId", "name patientCode phone")
      .populate("doctorId", "name email")
      .populate("departmentId", "name code");

    res.status(201).json({
      success: true,
      message: "Appointment booked successfully.",
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"].includes(status)) {
      throw new ApiError(400, "Invalid appointment status.");
    }

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    )
      .populate("patientId", "name patientCode phone")
      .populate("doctorId", "name email");

    if (!appointment) throw new ApiError(404, "Appointment not found.");

    res.status(200).json({
      success: true,
      message: `Appointment status updated to ${status}.`,
      data: appointment,
    });
  } catch (err) {
    next(err);
  }
};

