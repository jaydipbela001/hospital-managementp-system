import mongoose from "mongoose";

export const PAYMENT_METHODS = ["CASH", "CARD", "UPI", "INSURANCE", "STRIPE"];
export const PAYMENT_STATUSES = ["SUCCESS", "PENDING", "FAILED", "REFUNDED"];

const paymentSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
      index: true,
    },
    transactionReference: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "SUCCESS",
      index: true,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export const Payment =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export default Payment;

