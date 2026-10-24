import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "hr", "manager", "employee"], default: "employee" },
    employee: { type: Schema.Types.ObjectId, ref: "Employee" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default (mongoose.models.User as mongoose.Model<any>) || mongoose.model("User", schema);
