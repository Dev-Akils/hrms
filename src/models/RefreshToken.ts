import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true }, // one login session = one family
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
    userAgent: String,
    ip: String,
  },
  { timestamps: true }
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-delete after expiry

export default (mongoose.models.RefreshToken as mongoose.Model<any>) || mongoose.model("RefreshToken", schema);
