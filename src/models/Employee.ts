import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    employeeCode: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    department: { type: String, required: true, trim: true },
    designation: { type: String, required: true, trim: true },
    manager: { type: Schema.Types.ObjectId, ref: "Employee", default: null },
    joinDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "inactive", "on_leave"], default: "active" },
    salary: {
      basic: { type: Number, default: 0, min: 0 },
      allowances: { type: Number, default: 0, min: 0 },
    },
    leaveBalance: {
      annual: { type: Number, default: 18, min: 0 },
      sick: { type: Number, default: 12, min: 0 },
      casual: { type: Number, default: 6, min: 0 },
    },
  },
  { timestamps: true }
);
schema.index({ department: 1, status: 1 });
schema.index({ manager: 1 });

export default (mongoose.models.Employee as mongoose.Model<any>) || mongoose.model("Employee", schema);
