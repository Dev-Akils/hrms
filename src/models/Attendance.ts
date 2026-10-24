import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD in WORK_TZ
    checkIn: { type: Date, required: true },
    checkOut: Date,
    hours: Number,
    status: { type: String, enum: ["present", "half_day"], default: "present" },
  },
  { timestamps: true }
);
schema.index({ employee: 1, date: 1 }, { unique: true }); // one record per employee per day

export default (mongoose.models.Attendance as mongoose.Model<any>) || mongoose.model("Attendance", schema);
