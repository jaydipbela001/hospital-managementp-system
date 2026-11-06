import mongoose from "mongoose";

const careNoteSchema = new mongoose.Schema(
  {
    notedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      required: true,
      trim: true,
    },
    vitals: {
      bloodPressure: { type: String, default: "" },
      pulseRate: { type: Number, default: null },
      temperature: { type: Number, default: null },
      spO2: { type: Number, default: null },
    },
    notedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ipdAdmissionSchema = new mongoose.Schema(
  {
    admissionCode: {
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
    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bed",
      required: true,
      index: true,
    },
    admissionDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    admissionReason: {
      type: String,
      trim: true,
      required: true,
    },
    status: {
      type: String,
      enum: ["ADMITTED", "DISCHARGED"],
      default: "ADMITTED",
      index: true,
    },
    careNotes: {
      type: [careNoteSchema],
      default: [],
    },
    dischargeDate: {
      type: Date,
      default: null,
    },
    dischargeSummary: {
      conditionAtDischarge: { type: String, default: "" },
      dischargeAdvice: { type: String, default: "" },
      dischargedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
  },
  { timestamps: true }
);

export const IpdAdmission =
  mongoose.models.IpdAdmission ||
  mongoose.model("IpdAdmission", ipdAdmissionSchema);

export default IpdAdmission;

