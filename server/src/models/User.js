import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES } from "./Role.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Don't return password in normal queries
    },
    role: {
      type: String,
      required: true,
      enum: ROLES,
      default: "PATIENT",
      index: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      default: "ACTIVE",
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Method to verify password
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

// Static helper to hash password
userSchema.statics.hashPassword = async function (password) {
  return bcrypt.hash(password, 10);
};

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;

