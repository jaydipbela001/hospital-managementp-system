import mongoose from "mongoose";

const labTestSchema = new mongoose.Schema(
  {
    testCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    testName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true, // e.g. "Hematology", "Biochemistry", "Microbiology", "Radiology"
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    sampleType: {
      type: String,
      default: "Blood", // Blood, Urine, Sputum, Swab, etc.
      trim: true,
    },
    normalRange: {
      type: String,
      default: "",
    },
    unit: {
      type: String,
      default: "", // mg/dL, g/dL, etc.
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  { timestamps: true }
);

export const LabTest =
  mongoose.models.LabTest || mongoose.model("LabTest", labTestSchema);

export default LabTest;

