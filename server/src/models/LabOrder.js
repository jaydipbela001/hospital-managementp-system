import mongoose from "mongoose";

const labOrderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    testId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LabTest",
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ["ROUTINE", "URGENT", "STAT"],
      default: "ROUTINE",
    },
    status: {
      type: String,
      enum: ["ORDERED", "SAMPLE_COLLECTED", "IN_ANALYSIS", "COMPLETED", "CANCELLED"],
      default: "ORDERED",
      index: true,
    },
    clinicalNotes: {
      type: String,
      trim: true,
      default: "",
    },
    sampleCollectedAt: {
      type: Date,
      default: null,
    },
    result: {
      resultValue: { type: String, default: "" },
      interpretation: { type: String, default: "" },
      enteredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      verifiedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

export const LabOrder =
  mongoose.models.LabOrder || mongoose.model("LabOrder", labOrderSchema);

export default LabOrder;

