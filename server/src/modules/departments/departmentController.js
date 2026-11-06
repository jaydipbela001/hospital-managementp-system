import { Department } from "../../models/Department.js";
import { ApiError } from "../../utils/ApiError.js";

export const getDepartments = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: "i" };

    const departments = await Department.find(filter)
      .populate("headDoctorId", "name email phone")
      .sort({ name: 1 });

    res.status(200).json({ success: true, data: departments });
  } catch (err) {
    next(err);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description, headDoctorId } = req.body;
    if (!name) throw new ApiError(400, "Department name is required.");

    const generatedCode = code
      ? code.trim().toUpperCase()
      : name.trim().slice(0, 4).toUpperCase();

    const existing = await Department.findOne({
      $or: [
        { name: { $regex: `^${name.trim()}$`, $options: "i" } },
        { code: generatedCode },
      ],
    });
    if (existing) {
      throw new ApiError(409, "Department with this name or code already exists.");
    }

    const department = await Department.create({
      name: name.trim(),
      code: generatedCode,
      description,
      headDoctorId: headDoctorId || null,
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully.",
      data: department,
    });
  } catch (err) {
    next(err);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description, headDoctorId, status } = req.body;

    const updateData = { description, headDoctorId: headDoctorId || null, status };
    if (name) updateData.name = name.trim();
    if (code) updateData.code = code.trim().toUpperCase();

    const department = await Department.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!department) throw new ApiError(404, "Department not found.");

    res.status(200).json({
      success: true,
      message: "Department updated successfully.",
      data: department,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const department = await Department.findByIdAndDelete(id);
    if (!department) throw new ApiError(404, "Department not found.");

    res.status(200).json({
      success: true,
      message: "Department deleted successfully.",
    });
  } catch (err) {
    next(err);
  }
};

