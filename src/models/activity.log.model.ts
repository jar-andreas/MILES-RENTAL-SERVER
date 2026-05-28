import mongoose, { Schema, Document } from "mongoose";

// 1. TypeScript Interface mapping perfectly to your model pattern
export interface IActivityLog extends Document {
  label: string;
  variant: "success" | "warning" | "danger" | "info";
  user?: mongoose.Types.ObjectId; // 🌟 Using mongoose.Types.ObjectId directly as per your blueprint
  createdAt: Date;
  updatedAt: Date;
}

// 2. The Core Schema Configuration
const ActivityLogSchema = new Schema<IActivityLog>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    variant: {
      type: String,
      enum: ["success", "warning", "danger", "info"],
      default: "info",
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false, // Optional because some actions could be system-triggered webhooks
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt hooks
  },
);

// 3. Performance & Audit Feed Indexing
ActivityLogSchema.index({ createdAt: -1 }); // Crucial for sorting your live dashboard feeds quickly
ActivityLogSchema.index({ user: 1 });

// 4. Safe Singleton compilation check matching your architecture pattern
const ActivityLog =
  mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>(
    "ActivityLog",
    ActivityLogSchema,
    "activity_logs",
  );

export default ActivityLog;
