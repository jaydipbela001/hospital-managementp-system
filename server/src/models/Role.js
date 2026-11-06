import mongoose from "mongoose";

export const ROLES = [
  "SUPER_ADMIN",
  "HOSPITAL_ADMIN",
  "RECEPTIONIST",
  "DOCTOR",
  "NURSE",
  "PHARMACIST",
  "LAB_TECHNICIAN",
  "PATIENT",
];

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ROLES,
    },
    displayName: {
      type: String,
      required: true,
    },
    permissions: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export const Role = mongoose.models.Role || mongoose.model("Role", roleSchema);
export default Role;

