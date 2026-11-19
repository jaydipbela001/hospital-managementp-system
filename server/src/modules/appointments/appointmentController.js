import { Appointment } from "../../models/Appointment.js";
import { DoctorSchedule } from "../../models/DoctorSchedule.js";
import { User } from "../../models/User.js";
import { DoctorProfile } from "../../models/DoctorProfile.js";
import { Patient } from "../../models/Patient.js";
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
    const { doctorId, patientId, status, date, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (doctorId) filter.doctorId = doctorId;
    if (patientId) filter.patientId = patientId;
    if (status && status !== "ALL") filter.status = status;

    // Doctor can only see their own appointments unless Admin/Receptionist
    if (req.user.role === "DOCTOR") {
      filter.doctorId = req.user.id || req.user._id;
    }

    // Patient can only see their own appointments
    if (req.user.role === "PATIENT") {
      const patient = await Patient.findOne({ userId: req.user.id || req.user._id });
      if (!patient) {
        return res.status(200).json({
          success: true,
          data: [],
          meta: { page: 1, limit: parseInt(limit, 10), total: 0, totalPages: 0 },
        });
      }
      filter.patientId = patient._id;
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
        .populate("patientId", "name patientCode phone gender bloodGroup email")
        .populate("doctorId", "name email phone")
        .populate("departmentId", "name code")
        .sort({ startAt: -1 })
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

    // Parse date components safely in local time
    const [year, month, day] = date.split("-").map(Number);
    const targetDate = new Date(year, month - 1, day, 0, 0, 0);
    const dayOfWeek = targetDate.getDay();

    const schedule = await DoctorSchedule.findOne({ doctorId });
    // Filter all shifts for the target day of week
    const matchingShifts = schedule
      ? schedule.weeklyAvailability?.filter((w) => w.dayOfWeek === dayOfWeek) || []
      : (dayOfWeek >= 1 && dayOfWeek <= 5 ? [{ startTime: "09:00", endTime: "17:00" }] : []);

    const slotMinutes = schedule?.slotDurationMinutes || 30;

    // Check doctor exception/leave or non-working day
    const isException = schedule?.exceptions?.find((e) => e.date === date && !e.isAvailable);
    if (isException || matchingShifts.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        message: isException?.reason || "Doctor unavailable on this day.",
      });
    }

    // Fetch existing active appointments for that doctor on this day
    const dayRangeStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayRangeEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

    const booked = await Appointment.find({
      doctorId,
      status: { $in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] },
      startAt: { $lte: dayRangeEnd },
      endAt: { $gte: dayRangeStart },
    });

    const now = new Date();
    const slots = [];

    // Generate intervals for all active shifts of the day (continuous or split)
    for (const shift of matchingShifts) {
      const [startH, startM] = shift.startTime.split(":").map(Number);
      const [endH, endM] = shift.endTime.split(":").map(Number);

      const shiftStart = new Date(year, month - 1, day, startH, startM, 0, 0);
      const shiftEnd = new Date(year, month - 1, day, endH, endM, 0, 0);

      let current = new Date(shiftStart);

      while (current < shiftEnd) {
        const slotEnd = new Date(current.getTime() + slotMinutes * 60000);
        if (slotEnd > shiftEnd) break;

        const isBooked = booked.some((b) => {
          const bStart = new Date(b.startAt).getTime();
          const bEnd = new Date(b.endAt).getTime();
          return bStart < slotEnd.getTime() && bEnd > current.getTime();
        });

        // Do not show past time slots for current day
        const isPast = current.getTime() <= now.getTime();

        if (!isPast) {
          slots.push({
            startAt: new Date(current),
            endAt: slotEnd,
            isAvailable: !isBooked,
          });
        }

        current = slotEnd;
      }
    }

    slots.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

    res.status(200).json({ success: true, data: slots });
  } catch (err) {
    next(err);
  }
};

export const createAppointment = async (req, res, next) => {
  try {
    const { patientId, doctorId, departmentId, startAt, slots: multipleSlots, reason } = req.body;

    // Support single slot or multiple slots array (e.g. 1 hour = 2x30 min or multiple selected slots)
    const rawSlots = Array.isArray(multipleSlots) && multipleSlots.length > 0
      ? multipleSlots
      : startAt
      ? [startAt]
      : [];

    if (!doctorId || rawSlots.length === 0) {
      throw new ApiError(400, "doctorId and at least one appointment time slot are required.");
    }

    // Resolve patient: if patient role, find or create their patient profile automatically
    let resolvedPatientId = patientId;
    if (req.user.role === "PATIENT") {
      let patient = await Patient.findOne({ userId: req.user.id || req.user._id });
      if (!patient) {
        // Auto-create minimal patient profile if missing
        const year = new Date().getFullYear();
        const count = await Patient.countDocuments();
        const code = `PAT-${year}-${String(count + 1).padStart(4, "0")}`;
        patient = await Patient.create({
          patientCode: code,
          userId: req.user.id || req.user._id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone || "0000000000",
        });
      }
      resolvedPatientId = patient._id;
    }

    if (!resolvedPatientId) {
      throw new ApiError(400, "patientId is required.");
    }

    // Verify doctor exists and has role DOCTOR
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "DOCTOR") {
      throw new ApiError(404, "Doctor not found or invalid.");
    }

    const doctorProfile = await DoctorProfile.findOne({ userId: doctorId });
    const finalDepartmentId = departmentId || doctor.departmentId || doctorProfile?.departmentId || null;
    const consultationFee = doctorProfile?.consultationFee || 0;
    const schedule = await DoctorSchedule.findOne({ doctorId });
    const slotMinutes = schedule?.slotDurationMinutes || 30;

    // Sort unique slot start timestamps chronologically
    const sortedTimestamps = Array.from(
      new Set(rawSlots.map((s) => new Date(s).getTime()))
    ).sort((a, b) => a - b);

    // Merge contiguous (back-to-back) slots into unified session ranges
    const mergedSessions = [];
    for (const time of sortedTimestamps) {
      const slotStart = new Date(time);
      const slotEnd = new Date(time + slotMinutes * 60000);

      const prevSession = mergedSessions[mergedSessions.length - 1];
      if (prevSession && prevSession.endAt.getTime() === slotStart.getTime()) {
        // Contiguous back-to-back: extend current session
        prevSession.endAt = slotEnd;
        prevSession.slotCount += 1;
      } else {
        // Discontinuous or first slot: start a new session
        mergedSessions.push({
          startAt: slotStart,
          endAt: slotEnd,
          slotCount: 1,
        });
      }
    }

    const createdAppointments = [];
    const now = new Date();

    for (const session of mergedSessions) {
      if (session.startAt.getTime() <= now.getTime()) {
        throw new ApiError(
          400,
          `Cannot book session in the past: ${session.startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`
        );
      }

      // Check interval slot conflicts for doctor
      const doctorConflict = await Appointment.findOne({
        doctorId,
        status: { $in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] },
        startAt: { $lt: session.endAt },
        endAt: { $gt: session.startAt },
      });

      if (doctorConflict) {
        throw new ApiError(
          409,
          `Doctor already has a booking overlapping with ${session.startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} - ${session.endAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}.`
        );
      }

      // Check interval slot conflicts for patient
      const patientConflict = await Appointment.findOne({
        patientId: resolvedPatientId,
        status: { $in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] },
        startAt: { $lt: session.endAt },
        endAt: { $gt: session.startAt },
      });

      if (patientConflict) {
        throw new ApiError(
          409,
          `Patient already has an active appointment overlapping with ${session.startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} - ${session.endAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}.`
        );
      }

      const appointmentCode = await generateAppointmentCode();

      const apt = await Appointment.create({
        appointmentCode,
        patientId: resolvedPatientId,
        doctorId,
        departmentId: finalDepartmentId,
        startAt: session.startAt,
        endAt: session.endAt,
        reason: reason || "",
        consultationFee,
        createdBy: req.user.id || req.user._id,
        status: "CONFIRMED",
        statusHistory: [
          {
            status: "CONFIRMED",
            changedBy: req.user.id || req.user._id,
            note: session.slotCount > 1 ? `Booked ${session.slotCount} contiguous slots as a single session` : "Appointment booked successfully",
            changedAt: new Date(),
          },
        ],
      });

      createdAppointments.push(apt);
    }

    const populated = await Appointment.find({
      _id: { $in: createdAppointments.map((a) => a._id) },
    })
      .populate("patientId", "name patientCode phone email")
      .populate("doctorId", "name email")
      .populate("departmentId", "name code");

    res.status(201).json({
      success: true,
      message: `${createdAppointments.length} appointment slot(s) booked successfully.`,
      data: createdAppointments.length === 1 ? populated[0] : populated,
    });
  } catch (err) {
    next(err);
  }
};

export const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note, cancelReason } = req.body;

    const allowed = [
      "PENDING",
      "CONFIRMED",
      "CHECKED_IN",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "REJECTED",
      "NO_SHOW",
    ];

    if (!allowed.includes(status)) {
      throw new ApiError(400, "Invalid appointment status.");
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) throw new ApiError(404, "Appointment not found.");

    // Status transition rules & role checks
    if (req.user.role === "DOCTOR") {
      if (appointment.doctorId.toString() !== (req.user.id || req.user._id).toString()) {
        throw new ApiError(403, "You can only manage appointments assigned to you.");
      }
    }

    // Role restrictions on clinical transitions
    if (["IN_PROGRESS", "COMPLETED"].includes(status) && !["DOCTOR", "SUPER_ADMIN", "HOSPITAL_ADMIN"].includes(req.user.role)) {
      throw new ApiError(403, "Only the attending doctor can start or complete consultations.");
    }

    const updates = {
      status,
      $push: {
        statusHistory: {
          status,
          changedBy: req.user.id || req.user._id,
          note: note || cancelReason || `Status updated to ${status}`,
          changedAt: new Date(),
        },
      },
    };

    if (status === "CHECKED_IN") updates.checkInAt = new Date();
    if (status === "IN_PROGRESS") updates.consultationStartedAt = new Date();
    if (status === "COMPLETED") {
      updates.completedAt = new Date();
      if (note) updates.consultationNotes = note;
    }
    if (status === "CANCELLED" || status === "REJECTED") {
      updates.cancelledAt = new Date();
      updates.cancelReason = cancelReason || note || "";
      updates.cancelledBy = req.user.id || req.user._id;
    }

    const updated = await Appointment.findByIdAndUpdate(id, updates, { new: true })
      .populate("patientId", "name patientCode phone email bloodGroup gender allergies medicalHistory")
      .populate("doctorId", "name email")
      .populate("departmentId", "name code");

    res.status(200).json({
      success: true,
      message: `Appointment status updated to ${status}.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const getDoctorSchedule = async (req, res, next) => {
  try {
    const doctorId = req.query.doctorId || (req.user.role === "DOCTOR" ? (req.user.id || req.user._id) : null);
    if (!doctorId) {
      throw new ApiError(400, "Doctor ID is required.");
    }

    let schedule = await DoctorSchedule.findOne({ doctorId });
    if (!schedule) {
      // Default working hours Mon-Fri (1-5) 09:00 - 17:00
      schedule = {
        doctorId,
        slotDurationMinutes: 30,
        weeklyAvailability: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
          dayOfWeek,
          startTime: "09:00",
          endTime: "17:00",
        })),
        exceptions: [],
      };
    }

    res.status(200).json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
};

export const updateDoctorSchedule = async (req, res, next) => {
  try {
    let doctorId = req.user.id || req.user._id;
    if (["SUPER_ADMIN", "HOSPITAL_ADMIN"].includes(req.user.role) && req.body.doctorId) {
      doctorId = req.body.doctorId;
    }

    const { weeklyAvailability, slotDurationMinutes, exceptions } = req.body;

    const schedule = await DoctorSchedule.findOneAndUpdate(
      { doctorId },
      {
        doctorId,
        weeklyAvailability: weeklyAvailability || [],
        slotDurationMinutes: slotDurationMinutes || 30,
        exceptions: exceptions || [],
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Doctor schedule updated successfully.",
      data: schedule,
    });
  } catch (err) {
    next(err);
  }
};

export const rescheduleAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startAt, endAt, reason } = req.body;

    if (!startAt) {
      throw new ApiError(400, "New appointment date & time (startAt) is required.");
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) throw new ApiError(404, "Original appointment not found.");

    // Permissions check
    if (req.user.role === "PATIENT") {
      const patient = await Patient.findOne({ userId: req.user.id || req.user._id });
      if (!patient || appointment.patientId.toString() !== patient._id.toString()) {
        throw new ApiError(403, "You can only reschedule your own appointments.");
      }
    } else if (req.user.role === "DOCTOR") {
      if (appointment.doctorId.toString() !== (req.user.id || req.user._id).toString()) {
        throw new ApiError(403, "You can only reschedule your assigned appointments.");
      }
    }

    const newStart = new Date(startAt);
    const duration = appointment.endAt && appointment.startAt
      ? appointment.endAt.getTime() - appointment.startAt.getTime()
      : 30 * 60 * 1000;
    const newEnd = endAt ? new Date(endAt) : new Date(newStart.getTime() + duration);

    // Verify slot is not double-booked
    const existingConflict = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctorId: appointment.doctorId,
      status: { $in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] },
      startAt: { $lt: newEnd },
      endAt: { $gt: newStart },
    });
    if (existingConflict) {
      throw new ApiError(409, "The selected doctor already has a booked appointment at that time.");
    }

    // Save previous times and update
    const previousDateStr = appointment.startAt.toISOString();
    appointment.startAt = newStart;
    appointment.endAt = newEnd;
    appointment.status = "CONFIRMED";
    appointment.statusHistory.push({
      status: "CONFIRMED",
      changedBy: req.user.id || req.user._id,
      note: `Rescheduled from ${previousDateStr}. Reason: ${reason || "Patient request"}`,
      changedAt: new Date(),
    });

    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate("patientId", "name patientCode phone email")
      .populate("doctorId", "name email phone")
      .populate("departmentId", "name code");

    res.status(200).json({
      success: true,
      message: "Appointment rescheduled successfully.",
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};


