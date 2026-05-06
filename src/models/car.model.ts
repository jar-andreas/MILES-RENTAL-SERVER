import mongoose, { Schema, Document } from "mongoose";

export interface UserCar extends Document {
  _id: mongoose.Types.ObjectId;
  brand: string;
  segment:
    | "EXECUTIVE"
    | "LOGISTICS"
    | "FAMILY"
    | "CITY"
    | "PREMIUM"
    | "ELECTRIC";
  category: string;
  modelName: string;
  pricePerDay: number;
  capacity: number;
  fuelType: string;
  transmission: "Auto" | "Manual" | string;
  image: {
    url: string;
    public_id: string;
  };
  slug: string;
}

const CarSchema = new Schema<UserCar>(
  {
    brand: {
      type: String,
      required: true,
      trim: true,
    },

    segment: {
      type: String,
      required: true,
      uppercase: true, // Automatically saves as uppercase to match Figma
      enum: ["EXECUTIVE", "LOGISTICS", "FAMILY", "CITY", "PREMIUM", "ELECTRIC"],
    },

    category: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    modelName: {
      type: String,
      required: true,
      trim: true,
    },
    pricePerDay: {
      type: Number,
      required: true,
      min: [0, "Price per day cannot be negative"],
    },
    capacity: {
      type: Number,
      required: true,
      min: [1, "Capacity must be at least 1"],
    },
    fuelType: {
      type: String,
      required: true,
      trim: true,
    },
    transmission: {
      type: String,
      required: true,
      enum: ["Auto", "Manual"],
    },
    image: {
      url: { type: String, required: true },
      public_id: { type: String, required: true },
    },
    slug: {
            type: String,
            unique: true,
        },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

CarSchema.index({ brand: 1 });
CarSchema.index({ slug: 1 });
CarSchema.index({ category: 1 });
CarSchema.index({ segment: 1 });
CarSchema.index({ pricePerDay: 1 });

const Car =
  mongoose.models.Car || mongoose.model<UserCar>("Car", CarSchema, "car");

export default Car;
