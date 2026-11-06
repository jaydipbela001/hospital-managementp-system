import { Bed } from "../../models/Bed.js";
import { IpdAdmission } from "../../models/IpdAdmission.js";
import { Patient } from "../../models/Patient.js";
import { User } from "../../models/User.js";
import { ApiError } from "../../utils/ApiError.js";

const generateAdmissionCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `IPD-${year}-`;
  const latest = await IpdAdmission.findOne({ admissionCode: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .select("admissionCode");

  if (!latest) return `${prefix}0001`;
  const parts = latest.admissionCode.split("-");
  const nextNum = parseInt(parts[2], 10) + 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
};

// --- BEDS CRUD ---
export const getBeds = async (req, res, next) => {
  try {
    const { ward, status } = req.query;
    const filter = {};
    if (ward) filter.ward = ward;
    if (status) filter.status = status;

    let beds = await Bed.find(filter)
      .populate({
        path: "currentAdmissionId",
        select: "admissionCode admissionDate admissionReason",
        populate: [
          { path: "patientId", select: "name patientCode phone gender" },
          { path: "doctorId", select: "name" },
        ],
      })
      .sort({ ward: 1, roomNumber: 1, bedNumber: 1 });

    // Auto-seed default beds if none exist in the system
    if (beds.length === 0 && Object.keys(filter).length === 0) {
      const defaultBeds = [
        { ward: "General Ward", roomNumber: "101", bedNumber: "B1", dailyRate: 500 },
        { ward: "General Ward", roomNumber: "101", bedNumber: "B2", dailyRate: 500 },
        { ward: "General Ward", roomNumber: "102", bedNumber: "B1", dailyRate: 500 },
        { ward: "ICU", roomNumber: "ICU-1", bedNumber: "ICU-B1", dailyRate: 2500 },
        { ward: "ICU", roomNumber: "ICU-1", bedNumber: "ICU-B2", dailyRate: 2500 },
        { ward: "Pediatrics", roomNumber: "201", bedNumber: "P1", dailyRate: 700 },
        { ward: "Pediatrics", roomNumber: "201", bedNumber: "P2", dailyRate: 700 },
      ];
      await Bed.insertMany(defaultBeds);
      beds = await Bed.find().sort({ ward: 1, roomNumber: 1, bedNumber: 1 });
    }

    res.status(200).json({ success: true, data: beds });
  } catch (err) {
    next(err);
  }
};

export const createBed = async (req, res, next) => {
  try {
    const { bedNumber, ward, roomNumber, dailyRate } = req.body;
    if (!bedNumber || !ward || !roomNumber) {
      throw new ApiError(400, "bedNumber, ward, and roomNumber are required.");
    }

    const existing = await Bed.findOne({ bedNumber, ward, roomNumber });
    if (existing) {
      throw new ApiError(409, "A bed with this number already exists in this room.");
    }

    const bed = await Bed.create({
      bedNumber,
      ward,
      roomNumber,
      dailyRate: dailyRate || 500,
      status: "AVAILABLE",
    });

    res.status(201).json({ success: true, message: "Bed created successfully.", data: bed });
  } catch (err) {
    next(err);
  }
};

// --- ADMISSIONS WORKFLOW ---
export const getAdmissions = async (req, res, next) => {
  try {
    const { status, patientId, doctorId, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;

    if (req.user.role === "DOCTOR") {
      filter.doctorId = req.user.id || req.user._id;
    }
    if (req.user.role === "PATIENT") {
      const patient = await Patient.findOne({ userId: req.user.id || req.user._id });
      if (!patient) return res.status(200).json({ success: true, data: [], meta: { total: 0 } });
      filter.patientId = patient._id;
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [admissions, total] = await Promise.all([
      IpdAdmission.find(filter)
        .populate("patientId", "name patientCode phone gender bloodGroup allergies medicalHistory")
        .populate("doctorId", "name email phone")
        .populate("bedId", "bedNumber ward roomNumber dailyRate")
        .sort({ admissionDate: -1 })
        .skip(skip)
        .limit(take),
      IpdAdmission.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: admissions,
      meta: { page: parseInt(page, 10), limit: take, total, totalPages: Math.ceil(total / take) },
    });
  } catch (err) {
    next(err);
  }
};

export const admitPatient = async (req, res, next) => {
  try {
    const { patientId, doctorId, bedId, admissionReason } = req.body;

    if (!patientId || !doctorId || !bedId || !admissionReason) {
      throw new ApiError(400, "patientId, doctorId, bedId, and admissionReason are required.");
    }

    // Check if patient is already actively admitted
    const activePatientAdmission = await IpdAdmission.findOne({
      patientId,
      status: "ADMITTED",
    });
    if (activePatientAdmission) {
      throw new ApiError(409, "Patient is already actively admitted in an IPD ward.");
    }

    // Check bed availability atomically
    const bed = await Bed.findById(bedId);
    if (!bed) throw new ApiError(404, "Bed not found.");
    if (bed.status !== "AVAILABLE") {
      throw new ApiError(409, `Bed ${bed.bedNumber} is not available (Status: ${bed.status}).`);
    }

    const admissionCode = await generateAdmissionCode();

    const admission = await IpdAdmission.create({
      admissionCode,
      patientId,
      doctorId,
      bedId,
      admissionReason,
      status: "ADMITTED",
      admissionDate: new Date(),
    });

    // Mark bed as OCCUPIED
    bed.status = "OCCUPIED";
    bed.currentAdmissionId = admission._id;
    await bed.save();

    const populated = await IpdAdmission.findById(admission._id)
      .populate("patientId", "name patientCode phone gender bloodGroup")
      .populate("doctorId", "name email")
      .populate("bedId", "bedNumber ward roomNumber");

    res.status(201).json({
      success: true,
      message: "Patient admitted successfully.",
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

export const addCareNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note, vitals } = req.body;

    if (!note) throw new ApiError(400, "Care observation note is required.");

    const admission = await IpdAdmission.findById(id);
    if (!admission) throw new ApiError(404, "Admission record not found.");
    if (admission.status !== "ADMITTED") {
      throw new ApiError(400, "Cannot add care notes to a discharged patient.");
    }

    admission.careNotes.push({
      notedBy: req.user.id || req.user._id,
      role: req.user.role,
      note,
      vitals: vitals || {},
      notedAt: new Date(),
    });

    await admission.save();

    res.status(200).json({
      success: true,
      message: "Nursing / Clinical care note added successfully.",
      data: admission,
    });
  } catch (err) {
    next(err);
  }
};

export const dischargePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { conditionAtDischarge, dischargeAdvice } = req.body;

    const admission = await IpdAdmission.findById(id);
    if (!admission) throw new ApiError(404, "Admission record not found.");
    if (admission.status === "DISCHARGED") {
      throw new ApiError(400, "Patient is already discharged.");
    }

    // Role check: Only Doctor or Hospital Admin can discharge
    if (req.user.role === "DOCTOR" && admission.doctorId.toString() !== (req.user.id || req.user._id).toString()) {
      throw new ApiError(403, "Only the attending doctor can discharge this patient.");
    }

    admission.status = "DISCHARGED";
    admission.dischargeDate = new Date();
    admission.dischargeSummary = {
      conditionAtDischarge: conditionAtDischarge || "Recovered / Stable",
      dischargeAdvice: dischargeAdvice || "Routine follow up if needed.",
      dischargedBy: req.user.id || req.user._id,
    };

    await admission.save();

    // Release the bed
    await Bed.findByIdAndUpdate(admission.bedId, {
      status: "AVAILABLE",
      currentAdmissionId: null,
    });

    res.status(200).json({
      success: true,
      message: "Patient discharged and bed released successfully.",
      data: admission,
    });
  } catch (err) {
    next(err);
  }
};

