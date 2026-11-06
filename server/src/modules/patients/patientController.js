import { Patient } from "../../models/Patient.js";
import { ApiError } from "../../utils/ApiError.js";
import { uploadFile } from "../../utils/storageService.js";

// Generates next patient code e.g. PAT-2026-0001
const generatePatientCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `PAT-${year}-`;
  const latest = await Patient.findOne({ patientCode: { $regex: `^${prefix}` } })
    .sort({ createdAt: -1 })
    .select("patientCode");

  if (!latest) return `${prefix}0001`;
  const parts = latest.patientCode.split("-");
  const nextNum = parseInt(parts[2], 10) + 1;
  return `${prefix}${String(nextNum).padStart(4, "0")}`;
};

export const getPatients = async (req, res, next) => {
  try {
    const { search, bloodGroup, gender, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (gender) filter.gender = gender;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { patientCode: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [patients, total] = await Promise.all([
      Patient.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take),
      Patient.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: patients,
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

export const registerPatient = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      emergencyName,
      emergencyRelation,
      emergencyPhone,
      allergies,
      medicalHistory,
    } = req.body;

    if (!name || !phone) {
      throw new ApiError(400, "Patient name and phone number are required.");
    }

    const patientCode = await generatePatientCode();

    const patient = await Patient.create({
      patientCode,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : "",
      dateOfBirth: dateOfBirth || null,
      gender: gender || "OTHER",
      bloodGroup: bloodGroup || "UNKNOWN",
      address: address ? address.trim() : "",
      emergencyContact: {
        name: emergencyName || "",
        relation: emergencyRelation || "",
        phone: emergencyPhone || "",
      },
      allergies: allergies
        ? Array.isArray(allergies)
          ? allergies
          : allergies.split(",").map((a) => a.trim()).filter(Boolean)
        : [],
      medicalHistory: medicalHistory || "",
    });

    res.status(201).json({
      success: true,
      message: "Patient registered successfully.",
      data: patient,
    });
  } catch (err) {
    next(err);
  }
};

export const getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id);
    if (!patient) throw new ApiError(404, "Patient not found.");

    // If requester is a PATIENT, restrict access to own record only
    if (req.user.role === "PATIENT" && patient.userId?.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Access denied. You can only view your own patient record.");
    }

    res.status(200).json({ success: true, data: patient });
  } catch (err) {
    next(err);
  }
};

export const updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      emergencyName,
      emergencyRelation,
      emergencyPhone,
      allergies,
      medicalHistory,
      status,
    } = req.body;

    const patient = await Patient.findById(id);
    if (!patient) throw new ApiError(404, "Patient not found.");

    if (name) patient.name = name.trim();
    if (phone) patient.phone = phone.trim();
    if (email !== undefined) patient.email = email.trim().toLowerCase();
    if (dateOfBirth !== undefined) patient.dateOfBirth = dateOfBirth;
    if (gender) patient.gender = gender;
    if (bloodGroup) patient.bloodGroup = bloodGroup;
    if (address !== undefined) patient.address = address.trim();
    if (status) patient.status = status;
    if (medicalHistory !== undefined) patient.medicalHistory = medicalHistory;

    if (emergencyName !== undefined || emergencyRelation !== undefined || emergencyPhone !== undefined) {
      patient.emergencyContact = {
        name: emergencyName ?? patient.emergencyContact.name,
        relation: emergencyRelation ?? patient.emergencyContact.relation,
        phone: emergencyPhone ?? patient.emergencyContact.phone,
      };
    }

    if (allergies !== undefined) {
      patient.allergies = Array.isArray(allergies)
        ? allergies
        : allergies.split(",").map((a) => a.trim()).filter(Boolean);
    }

    await patient.save();

    res.status(200).json({
      success: true,
      message: "Patient record updated successfully.",
      data: patient,
    });
  } catch (err) {
    next(err);
  }
};

export const uploadPatientDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!req.file) throw new ApiError(400, "Document file is required.");
    if (!title) throw new ApiError(400, "Document title is required.");

    const patient = await Patient.findById(id);
    if (!patient) throw new ApiError(404, "Patient not found.");

    const fileUrl = await uploadFile(req.file, "documents");
    patient.documents.push({ title, fileUrl });
    await patient.save();

    res.status(200).json({
      success: true,
      message: "Document attached successfully.",
      data: patient.documents,
    });
  } catch (err) {
    next(err);
  }
};

