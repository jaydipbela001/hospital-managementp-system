import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    medicineCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    genericName: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      required: true, // e.g. "Antibiotic", "Analgesic", "Antipyretic", "Antihypertensive"
      trim: true,
    },
    unit: {
      type: String,
      default: "Tablet", // Tablet, Capsule, Syrup, Injection, Ointment
      trim: true,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    reorderLevel: {
      type: Number,
      default: 50,
      min: 0,
    },
    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    batches: [
      {
        batchNumber: { type: String, required: true },
        expiryDate: { type: Date, required: true },
        quantity: { type: Number, required: true, min: 0 },
        purchasePrice: { type: Number, default: 0 },
      },
    ],
    status: {
      type: String,
      enum: ["ACTIVE", "DISCONTINUED"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

export const Medicine =
  mongoose.models.Medicine || mongoose.model("Medicine", medicineSchema);

export default Medicine;

