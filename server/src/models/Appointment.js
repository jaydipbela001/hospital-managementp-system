import mongoose from "mongoose";

export const APPOINTMENT_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "REJECTED",
  "NO_SHOW",
];

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    appointmentCode: {
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
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    startAt: {
      type: Date,
      required: true,
      index: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: APPOINTMENT_STATUSES,
      default: "CONFIRMED",
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      default: "",
    },
    consultationFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    checkInAt: {
      type: Date,
      default: null,
    },
    consultationStartedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelReason: {
      type: String,
      trim: true,
      default: "",
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rescheduledFromAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    rescheduledToAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent overlapping appointments for the same doctor with active status
appointmentSchema.index(
  { doctorId: 1, startAt: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"] },
    },
  }
);

// Helpful query indexes
appointmentSchema.index({ patientId: 1, startAt: -1 });
appointmentSchema.index({ doctorId: 1, status: 1 });

export const Appointment =
  mongoose.models.Appointment || mongoose.model("Appointment", appointmentSchema);
export default Appointment;
