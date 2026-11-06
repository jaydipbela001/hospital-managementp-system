import mongoose from "mongoose";

const doctorScheduleSchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Weekly recurring slots (0 = Sunday, 1 = Monday, ... 6 = Saturday)
    weeklyAvailability: [
      {
        dayOfWeek: {
          type: Number,
          required: true,
          min: 0,
          max: 6,
        },
        startTime: {
          type: String, // HH:mm format e.g. "09:00"
          required: true,
        },
        endTime: {
          type: String, // HH:mm format e.g. "17:00"
          required: true,
        },
      },
    ],
    slotDurationMinutes: {
      type: Number,
      default: 20,
      min: 10,
      max: 60,
    },
    exceptions: [
      {
        date: { type: String, required: true }, // YYYY-MM-DD
        isAvailable: { type: Boolean, default: false }, // false = leave / holiday
        reason: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

export const DoctorSchedule =
  mongoose.models.DoctorSchedule ||
  mongoose.model("DoctorSchedule", doctorScheduleSchema);
export default DoctorSchedule;

