import { Hospital } from "../../models/Hospital.js";
import { uploadFile } from "../../utils/storageService.js";

export const getHospitalProfile = async (_req, res, next) => {
  try {
    let hospital = await Hospital.findOne();
    if (!hospital) {
      hospital = await Hospital.create({ name: "Central Hospital" });
    }
    res.status(200).json({ success: true, data: hospital });
  } catch (err) {
    next(err);
  }
};

export const updateHospitalProfile = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.logoUrl = await uploadFile(req.file, "hospital");
    }

    let hospital = await Hospital.findOneAndUpdate({}, updateData, {
      new: true,
      upsert: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Hospital profile updated successfully.",
      data: hospital,
    });
  } catch (err) {
    next(err);
  }
};

