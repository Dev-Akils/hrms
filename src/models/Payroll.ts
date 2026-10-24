import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
    month: { type: String, required: true }, // YYYY-MM
    basic: Number,
    allowances: Number,
    gross: Number,
    workingDays: Number,
    lopDays: { type: Number, default: 0 }, // loss-of-pay days (approved unpaid leave)
    deductions: { lop: Number, pf: Number },
    net: Number,
    status: { type: String, enum: ["generated", "paid"], default: "generated" },
    paidAt: Date,
  },
  { timestamps: true }
);
schema.index({ employee: 1, month: 1 }, { unique: true });

export default (mongoose.models.Payroll as mongoose.Model<any>) || mongoose.model("Payroll", schema);
