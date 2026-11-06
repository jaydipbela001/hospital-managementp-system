import { User } from "../../models/User.js";
import { DoctorProfile } from "../../models/DoctorProfile.js";
import { ApiError } from "../../utils/ApiError.js";
import { uploadFile } from "../../utils/storageService.js";

export const getStaff = async (req, res, next) => {
  try {
    const { role, departmentId, search, status, page = 1, limit = 10 } = req.query;
    const filter = { role: { $ne: "PATIENT" } };

    if (role) filter.role = role;
    if (departmentId) filter.departmentId = departmentId;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [staff, total] = await Promise.all([
      User.find(filter)
        .populate("departmentId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(take),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: staff,
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

export const createStaff = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      departmentId,
      specialization,
      qualifications,
      consultationFee,
      experienceYears,
      bio,
    } = req.body;

    if (!name || !email || !password || !role) {
      throw new ApiError(400, "Name, email, password, and role are required.");
    }

    if (role === "PATIENT") {
      throw new ApiError(400, "Cannot create a patient through staff endpoint.");
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(409, "User with this email already exists.");
    }

    let avatarUrl = "";
    if (req.file) {
      avatarUrl = await uploadFile(req.file, "avatars");
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash: password,
      role,
      departmentId: departmentId || null,
      avatarUrl,
    });

    if (role === "DOCTOR") {
      await DoctorProfile.create({
        userId: user._id,
        departmentId: departmentId || null,
        specialization: specialization || "",
        qualifications: qualifications
          ? Array.isArray(qualifications)
            ? qualifications
            : qualifications.split(",").map((q) => q.trim())
          : [],
        consultationFee: consultationFee ? Number(consultationFee) : 0,
        experienceYears: experienceYears ? Number(experienceYears) : 0,
        bio: bio || "",
      });
    }

    const created = await User.findById(user._id).populate("departmentId", "name");

    res.status(201).json({
      success: true,
      message: "Staff member created successfully.",
      data: created,
    });
  } catch (err) {
    next(err);
  }
};

export const getStaffById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate("departmentId", "name");
    if (!user) throw new ApiError(404, "Staff member not found.");

    let doctorProfile = null;
    if (user.role === "DOCTOR") {
      doctorProfile = await DoctorProfile.findOne({ userId: user._id }).populate(
        "departmentId",
        "name"
      );
    }

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        doctorProfile,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      role,
      departmentId,
      status,
      specialization,
      qualifications,
      consultationFee,
      experienceYears,
      bio,
    } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (phone !== undefined) updateFields.phone = phone;
    if (role) updateFields.role = role;
    if (departmentId !== undefined) updateFields.departmentId = departmentId || null;
    if (status) updateFields.status = status;

    if (req.file) {
      updateFields.avatarUrl = await uploadFile(req.file, "avatars");
    }

    const user = await User.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    }).populate("departmentId", "name");

    if (!user) throw new ApiError(404, "Staff member not found.");

    if (user.role === "DOCTOR") {
      const docFields = {};
      if (departmentId !== undefined) docFields.departmentId = departmentId || null;
      if (specialization !== undefined) docFields.specialization = specialization;
      if (qualifications !== undefined) {
        docFields.qualifications = Array.isArray(qualifications)
          ? qualifications
          : qualifications.split(",").map((q) => q.trim());
      }
      if (consultationFee !== undefined) docFields.consultationFee = Number(consultationFee);
      if (experienceYears !== undefined) docFields.experienceYears = Number(experienceYears);
      if (bio !== undefined) docFields.bio = bio;

      await DoctorProfile.findOneAndUpdate({ userId: user._id }, docFields, {
        upsert: true,
      });
    }

    res.status(200).json({
      success: true,
      message: "Staff member updated successfully.",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

