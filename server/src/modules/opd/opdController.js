import { OpdConsultation } from "../../models/OpdConsultation.js";
import { Appointment } from "../../models/Appointment.js";
import { Patient } from "../../models/Patient.js";
import { User } from "../../models/User.js";
import { ApiError } from "../../utils/ApiError.js";

// Generates next OPD code e.g. OPD-2026-0001
const generateOpdCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `OPD-${year}-`;
  const latest = await OpdConsultation.findOne({ opdCode: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .select("opdCode");

  if (!latest) return `${prefix}0001`;
  const parts = latest.opdCode.split("-");
  const nextNum = parseInt(parts[2], 10) + 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
};

export const getOpdConsultations = async (req, res, next) => {
  try {
    const { patientId, doctorId, page = 1, limit = 25 } = req.query;
    const filter = {};

    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;

    // Doctor can only see their own OPD consultations unless Admin/Receptionist
    if (req.user.role === "DOCTOR") {
      filter.doctorId = req.user.id || req.user._id;
    }

    // Patient can only see their own consultations
    if (req.user.role === "PATIENT") {
      const patient = await Patient.findOne({ userId: req.user.id || req.user._id });
      if (!patient) {
        return res.status(200).json({ success: true, data: [], meta: { total: 0 } });
      }
      filter.patientId = patient._id;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [records, total] = await Promise.all([
      OpdConsultation.find(filter)
        .populate("patientId", "name patientCode phone gender bloodGroup dateOfBirth allergies medicalHistory")
        .populate("doctorId", "name email phone")
        .populate("departmentId", "name code")
        .populate("appointmentId", "appointmentCode startAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take),
      OpdConsultation.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: records,
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

export const getOpdConsultationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const opd = await OpdConsultation.findById(id)
      .populate("patientId", "name patientCode phone gender bloodGroup dateOfBirth allergies medicalHistory address")
      .populate("doctorId", "name email phone")
      .populate("departmentId", "name code")
      .populate("appointmentId", "appointmentCode startAt endAt");

    if (!opd) throw new ApiError(404, "OPD Consultation not found.");

    // Ownership check
    if (req.user.role === "PATIENT") {
      const patient = await Patient.findOne({ userId: req.user.id || req.user._id });
      if (!patient || opd.patientId._id.toString() !== patient._id.toString()) {
        throw new ApiError(403, "Access denied to this consultation record.");
      }
    }

    res.status(200).json({ success: true, data: opd });
  } catch (err) {
    next(err);
  }
};

export const createOpdConsultation = async (req, res, next) => {
  try {
    const {
      appointmentId,
      patientId,
      doctorId: inputDoctorId,
      departmentId,
      vitals,
      chiefComplaints,
      diagnosis,
      clinicalNotes,
      prescriptions,
      followUpDate,
    } = req.body;

    if (!patientId || !diagnosis) {
      throw new ApiError(400, "patientId and diagnosis are required.");
    }

    const doctorId = req.user.role === "DOCTOR" ? (req.user.id || req.user._id) : inputDoctorId;
    if (!doctorId) {
      throw new ApiError(400, "doctorId is required.");
    }

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "DOCTOR") {
      throw new ApiError(404, "Assigned doctor is invalid.");
    }

    const opdCode = await generateOpdCode();

    const opd = await OpdConsultation.create({
      opdCode,
      appointmentId: appointmentId || null,
      patientId,
      doctorId,
      departmentId: departmentId || doctor.departmentId || null,
      vitals: vitals || {},
      chiefComplaints: chiefComplaints || "",
      diagnosis,
      clinicalNotes: clinicalNotes || "",
      prescriptions: Array.isArray(prescriptions) ? prescriptions : [],
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      status: "FINALIZED",
    });

    // If linked to an appointment, automatically complete it and link notes
    if (appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, {
        status: "COMPLETED",
        completedAt: new Date(),
        consultationNotes: diagnosis,
        $push: {
          statusHistory: {
            status: "COMPLETED",
            changedBy: req.user.id || req.user._id,
            note: `Encounter completed via OPD Record ${opdCode}`,
            changedAt: new Date(),
          },
        },
      });
    }

    const populated = await OpdConsultation.findById(opd._id)
      .populate("patientId", "name patientCode phone gender bloodGroup")
      .populate("doctorId", "name email")
      .populate("departmentId", "name code");

    res.status(201).json({
      success: true,
      message: "OPD Consultation & Prescription created successfully.",
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

