import mongoose from "mongoose";
import { Appointment } from "../../models/Appointment.js";
import { DoctorSchedule } from "../../models/DoctorSchedule.js";
import { User } from "../../models/User.js";
import { DoctorProfile } from "../../models/DoctorProfile.js";
import { Patient } from "../../models/Patient.js";
import { Department } from "../../models/Department.js";
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
    const { doctorId, patientId, status, date, timeframe, page = 1, limit = 50 } = req.query;
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

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (timeframe === "TODAY") {
      filter.startAt = { $gte: todayStart, $lte: todayEnd };
    } else if (timeframe === "UPCOMING") {
      filter.startAt = { $gt: now };
    } else if (timeframe === "PAST") {
      filter.startAt = { $lt: now };
    } else if (date && date !== "ALL") {
      const [year, month, day] = date.split("-").map(Number);
      const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
      filter.startAt = { $gte: dayStart, $lte: dayEnd };
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);
    const sortDir = req.query.sortOrder === "desc" ? -1 : (req.query.sortOrder === "asc" || req.user.role === "PATIENT" ? 1 : -1);

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate("patientId", "name patientCode phone gender bloodGroup email")
        .populate("doctorId", "name email phone")
        .populate("departmentId", "name code")
        .sort({ startAt: sortDir })
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
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    const { doctorId, date } = req.query;
    if (!doctorId || !date) {
      throw new ApiError(400, "doctorId and date (YYYY-MM-DD) are required.");
    }

    // Parse date components safely in local time
    const [year, month, day] = date.split("-").map(Number);
    const targetDate = new Date(year, month - 1, day, 0, 0, 0);
    const dayOfWeek = targetDate.getDay();

    const docObjId = mongoose.Types.ObjectId.isValid(doctorId)
      ? new mongoose.Types.ObjectId(doctorId)
      : doctorId;

    const schedule = await DoctorSchedule.findOne({ doctorId: docObjId });
    // Filter all shifts for the target day of week
    const matchingShifts = schedule
      ? schedule.weeklyAvailability?.filter((w) => Number(w.dayOfWeek) === Number(dayOfWeek)) || []
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
      doctorId: docObjId,
      status: { $in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] },
      startAt: { $lte: dayRangeEnd },
      endAt: { $gte: dayRangeStart },
    });

    // Also check patient busy intervals if patientId is provided or user is a PATIENT
    let patientBooked = [];
    let patientIdToCheck = req.query.patientId;
    if (!patientIdToCheck && req.user && req.user.role === "PATIENT") {
      const pat = await Patient.findOne({ userId: req.user.id || req.user._id });
      if (pat) patientIdToCheck = pat._id;
    }
    if (patientIdToCheck) {
      patientBooked = await Appointment.find({
        patientId: patientIdToCheck,
        status: { $in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] },
        startAt: { $lte: dayRangeEnd },
        endAt: { $gte: dayRangeStart },
      });
    }

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

        const isDoctorBooked = booked.some((b) => {
          const bStart = new Date(b.startAt).getTime();
          const bEnd = new Date(b.endAt).getTime();
          return bStart < slotEnd.getTime() && bEnd > current.getTime();
        });

        const isPatientBooked = patientBooked.some((b) => {
          const bStart = new Date(b.startAt).getTime();
          const bEnd = new Date(b.endAt).getTime();
          return bStart < slotEnd.getTime() && bEnd > current.getTime();
        });

        // Do not show past time slots for current day
        const isPast = current.getTime() <= now.getTime();

        const isAvailable = !isDoctorBooked && !isPatientBooked;
        const conflictReason = isDoctorBooked
          ? "Doctor booked"
          : isPatientBooked
          ? "You already have an appointment at this time"
          : null;

        if (!isPast) {
          slots.push({
            startAt: new Date(current),
            endAt: slotEnd,
            isAvailable,
            conflictReason,
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
    const docObjId = mongoose.Types.ObjectId.isValid(doctorId)
      ? new mongoose.Types.ObjectId(doctorId)
      : doctorId;

    const doctor = await User.findById(docObjId);
    if (!doctor || doctor.role !== "DOCTOR") {
      throw new ApiError(404, "Doctor not found or invalid.");
    }

    const doctorProfile = await DoctorProfile.findOne({ userId: docObjId });
    const finalDepartmentId = departmentId || doctor.departmentId || doctorProfile?.departmentId || null;
    const consultationFee = doctorProfile?.consultationFee || 0;
    const schedule = await DoctorSchedule.findOne({ doctorId: docObjId });
    const slotMinutes = schedule?.slotDurationMinutes || 30;

    // Normalize raw slots (supports ISO strings or { startAt, endAt } objects)
    const normalizedSlots = rawSlots.map((s) => {
      if (typeof s === "object" && s !== null && s.startAt) {
        const start = new Date(s.startAt);
        const end = s.endAt ? new Date(s.endAt) : new Date(start.getTime() + slotMinutes * 60000);
        return { startAt: start, endAt: end };
      }
      const start = new Date(s);
      const end = new Date(start.getTime() + slotMinutes * 60000);
      return { startAt: start, endAt: end };
    });

    // Sort by startAt ascending
    normalizedSlots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

    // Merge contiguous (back-to-back) or overlapping slots into unified session ranges
    const mergedSessions = [];
    for (const slot of normalizedSlots) {
      const prevSession = mergedSessions[mergedSessions.length - 1];
      if (prevSession && prevSession.endAt.getTime() >= slot.startAt.getTime()) {
        // Contiguous back-to-back: extend current session if this slot ends later
        if (slot.endAt.getTime() > prevSession.endAt.getTime()) {
          prevSession.endAt = slot.endAt;
        }
        prevSession.slotCount += 1;
      } else {
        // Discontinuous or first slot: start a new session
        mergedSessions.push({
          startAt: new Date(slot.startAt),
          endAt: new Date(slot.endAt),
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

      // Strictly validate that requested slot falls within doctor's active working hours
      const sessStart = new Date(session.startAt);
      const sessEnd = new Date(session.endAt);
      const sessDayOfWeek = sessStart.getDay();
      const pad = (n) => String(n).padStart(2, "0");
      const dateStr = `${sessStart.getFullYear()}-${pad(sessStart.getMonth() + 1)}-${pad(sessStart.getDate())}`;

      const isException = schedule?.exceptions?.find((e) => e.date === dateStr && !e.isAvailable);
      if (isException) {
        throw new ApiError(400, `Doctor is unavailable on ${dateStr}: ${isException.reason || "On Leave"}`);
      }

      const dayShifts = schedule
        ? schedule.weeklyAvailability?.filter((w) => Number(w.dayOfWeek) === Number(sessDayOfWeek)) || []
        : (sessDayOfWeek >= 1 && sessDayOfWeek <= 5 ? [{ startTime: "09:00", endTime: "17:00" }] : []);

      if (dayShifts.length === 0) {
        throw new ApiError(400, "Doctor has no active consultation hours configured for this day.");
      }

      const sessStartH = `${pad(sessStart.getHours())}:${pad(sessStart.getMinutes())}`;
      const sessEndH = `${pad(sessEnd.getHours())}:${pad(sessEnd.getMinutes())}`;

      const fitsInShift = dayShifts.some((shift) => {
        return sessStartH >= shift.startTime && sessEndH <= shift.endTime;
      });

      if (!fitsInShift) {
        throw new ApiError(
          400,
          `The selected appointment time (${sessStartH} – ${sessEndH}) is outside the doctor's working schedule.`
        );
      }

      // Check interval slot conflicts for doctor (excluding appointments created in this request)
      const doctorConflict = await Appointment.findOne({
        _id: { $nin: createdAppointments.map((a) => a._id) },
        doctorId: docObjId,
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

      // Check interval slot conflicts for patient (excluding appointments created in this request)
      const patientConflict = await Appointment.findOne({
        _id: { $nin: createdAppointments.map((a) => a._id) },
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
        doctorId: docObjId,
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
    if (req.user.role === "PATIENT") {
      if (status !== "CANCELLED") {
        throw new ApiError(403, "Patients can only cancel appointments.");
      }
      const patient = await Patient.findOne({ userId: req.user.id || req.user._id });
      if (!patient || appointment.patientId.toString() !== patient._id.toString()) {
        throw new ApiError(403, "You can only cancel your own appointments.");
      }
    }

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
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    const doctorId = req.query.doctorId || (req.user.role === "DOCTOR" ? (req.user.id || req.user._id) : null);
    if (!doctorId) {
      throw new ApiError(400, "Doctor ID is required.");
    }

    const docObjId = mongoose.Types.ObjectId.isValid(doctorId)
      ? new mongoose.Types.ObjectId(doctorId)
      : doctorId;

    let schedule = await DoctorSchedule.findOne({ doctorId: docObjId });
    if (!schedule) {
      // Default working hours Mon-Fri (1-5) 09:00 - 17:00
      schedule = {
        doctorId: docObjId,
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

    const docObjId = mongoose.Types.ObjectId.isValid(doctorId)
      ? new mongoose.Types.ObjectId(doctorId)
      : doctorId;

    const formattedAvailability = (weeklyAvailability || []).map((w) => ({
      dayOfWeek: Number(w.dayOfWeek),
      startTime: String(w.startTime).trim(),
      endTime: String(w.endTime).trim(),
    }));

    const schedule = await DoctorSchedule.findOneAndUpdate(
      { doctorId: docObjId },
      {
        doctorId: docObjId,
        weeklyAvailability: formattedAvailability,
        slotDurationMinutes: Number(slotDurationMinutes) || 30,
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
    const { startAt, endAt, slots: rawSlots, reason } = req.body;

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

    let newStart;
    let newEnd;
    let slotCount = 1;

    if (Array.isArray(rawSlots) && rawSlots.length > 0) {
      const schedule = await DoctorSchedule.findOne({ doctorId: appointment.doctorId });
      const slotMinutes = schedule?.slotDurationMinutes || 30;

      const normalizedSlots = rawSlots.map((s) => {
        if (typeof s === "object" && s !== null && s.startAt) {
          const start = new Date(s.startAt);
          const end = s.endAt ? new Date(s.endAt) : new Date(start.getTime() + slotMinutes * 60000);
          return { startAt: start, endAt: end };
        }
        const start = new Date(s);
        const end = new Date(start.getTime() + slotMinutes * 60000);
        return { startAt: start, endAt: end };
      });

      normalizedSlots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
      newStart = normalizedSlots[0].startAt;
      newEnd = normalizedSlots[normalizedSlots.length - 1].endAt;
      slotCount = normalizedSlots.length;
    } else if (startAt) {
      newStart = new Date(startAt);
      const duration = appointment.endAt && appointment.startAt
        ? appointment.endAt.getTime() - appointment.startAt.getTime()
        : 30 * 60 * 1000;
      newEnd = endAt ? new Date(endAt) : new Date(newStart.getTime() + duration);
    } else {
      throw new ApiError(400, "New appointment date & time is required.");
    }

    const now = new Date();
    if (newStart.getTime() <= now.getTime()) {
      throw new ApiError(400, "Cannot reschedule appointment to a time in the past.");
    }

    // Verify slot is not double-booked for doctor
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

    // Verify slot is not double-booked for patient
    const patientConflict = await Appointment.findOne({
      _id: { $ne: appointment._id },
      patientId: appointment.patientId,
      status: { $in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] },
      startAt: { $lt: newEnd },
      endAt: { $gt: newStart },
    });
    if (patientConflict) {
      throw new ApiError(409, "You already have another active appointment at that time.");
    }

    // Save previous times and update
    const previousDateStr = appointment.startAt.toISOString();
    appointment.startAt = newStart;
    appointment.endAt = newEnd;
    appointment.status = "CONFIRMED";
    appointment.statusHistory.push({
      status: "CONFIRMED",
      changedBy: req.user.id || req.user._id,
      note: `Rescheduled to ${slotCount > 1 ? slotCount + ' slots' : 'new time'} from ${previousDateStr}. Reason: ${reason || "Patient request"}`,
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


