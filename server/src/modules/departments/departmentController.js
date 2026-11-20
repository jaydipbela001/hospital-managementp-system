import { Department } from "../../models/Department.js";

export const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ status: "ACTIVE" })
      .select("name code description status")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: departments,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  getDepartments,
};

