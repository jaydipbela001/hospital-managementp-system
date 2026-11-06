import mongoose from "mongoose";

const prescriptionItemSchema = new mongoose.Schema(
  {
    medicineName: {
      type: String,
      required: true,
      trim: true,
    },
    dosage: {
      type: String,
      required: true, // e.g. "500mg", "1 tablet"
      trim: true,
    },
    frequency: {
      type: String,
      required: true, // e.g. "1-0-1" (twice daily), "Once daily"
      trim: true,
    },
    duration: {
      type: String,
      required: true, // e.g. "5 days", "1 month"
      trim: true,
    },
    instructions: {
      type: String,
      default: "After food", // "Before food", "After food", etc.
      trim: true,
    },
  },
  { _id: false }
);

const vitalsSchema = new mongoose.Schema(
  {
    bloodPressure: { type: String, default: "" }, // e.g. "120/80"
    pulseRate: { type: Number, default: null }, // bpm
    temperature: { type: Number, default: null }, // Fahrenheit or Celsius
    spO2: { type: Number, default: null }, // percentage e.g. 98
    weightKg: { type: Number, default: null },
    heightCm: { type: Number, default: null },
  },
  { _id: false }
);

const opdConsultationSchema = new mongoose.Schema(
  {
    opdCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
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
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    vitals: {
      type: vitalsSchema,
      default: () => ({}),
    },
    chiefComplaints: {
      type: String,
      trim: true,
      default: "",
    },
    diagnosis: {
      type: String,
      trim: true,
      required: true,
    },
    clinicalNotes: {
      type: String,
      trim: true,
      default: "",
    },
    prescriptions: {
      type: [prescriptionItemSchema],
      default: [],
    },
    followUpDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["DRAFT", "FINALIZED"],
      default: "FINALIZED",
      index: true,
    },
  },
  { timestamps: true }
);

export const OpdConsultation =
  mongoose.models.OpdConsultation ||
  mongoose.model("OpdConsultation", opdConsultationSchema);

export default OpdConsultation;

