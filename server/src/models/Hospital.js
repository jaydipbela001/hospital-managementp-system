import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: "Central Hospital",
    },
    logoUrl: {
      type: String,
      default: "",
    },
    tagline: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    currency: {
      type: String,
      default: "USD",
    },
    timezone: {
      type: String,
      default: "UTC",
    },
  },
  { timestamps: true }
);

export const Hospital =
  mongoose.models.Hospital || mongoose.model("Hospital", hospitalSchema);
export default Hospital;

