import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", index: true },
    actorRole: String,
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true },
    resourceId: String,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    ip: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Append-only
for (const op of ["updateOne", "updateMany", "findOneAndUpdate", "deleteOne", "deleteMany", "findOneAndDelete"] as const) {
  schema.pre(op, function () {
    throw new Error("Audit logs are append-only");
  });
}

export default (mongoose.models.AuditLog as mongoose.Model<any>) || mongoose.model("AuditLog", schema);
