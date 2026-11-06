import mongoose from "mongoose";

const bedSchema = new mongoose.Schema(
  {
    bedNumber: {
      type: String,
      required: true,
      trim: true,
    },
    ward: {
      type: String,
      required: true, // e.g. "General Male", "ICU", "Maternity", "Pediatrics"
      trim: true,
    },
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
    dailyRate: {
      type: Number,
      default: 500,
      min: 0,
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "OCCUPIED", "MAINTENANCE"],
      default: "AVAILABLE",
      index: true,
    },
    currentAdmissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IpdAdmission",
      default: null,
    },
  },
  { timestamps: true }
);

bedSchema.index({ ward: 1, roomNumber: 1, bedNumber: 1 }, { unique: true });

export const Bed = mongoose.models.Bed || mongoose.model("Bed", bedSchema);
export default Bed;

