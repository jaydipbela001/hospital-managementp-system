import mongoose from "mongoose";

export const ROLES = [
  "PATIENT",
  "DOCTOR",
  "RECEPTIONIST",
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
