import mongoose from "mongoose";

const doctorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    specialization: {
      type: String,
      trim: true,
      default: "",
    },
    qualifications: {
      type: [String],
      default: [],
    },
    consultationFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    experienceYears: {
      type: Number,
      min: 0,
      default: 0,
    },
    bio: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export const DoctorProfile =
  mongoose.models.DoctorProfile ||
  mongoose.model("DoctorProfile", doctorProfileSchema);
export default DoctorProfile;

