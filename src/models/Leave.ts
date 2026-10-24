import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    type: { type: String, enum: ["annual", "sick", "casual", "unpaid"], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true, min: 0.5 }, // working days (Mon–Fri)
    reason: { type: String, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected", "cancelled"], default: "pending" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    remarks: String,
  },
  { timestamps: true }
);
schema.index({ employee: 1, status: 1 });
schema.index({ startDate: 1, endDate: 1 });

export default (mongoose.models.Leave as mongoose.Model<any>) || mongoose.model("Leave", schema);
