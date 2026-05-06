import mongoose, { Schema, Document } from "mongoose";

export interface UserCar extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  category: string;
  type: string;
  pricePerDay: number;
  capacity: number;
  fuelType: string;
  transmission: "Auto" | "Manual" | string;
  imageUrl: string;
}

const CarSchema = new Schema<UserCar>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
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
    imageUrl: {
      type: String,
      required: true,
    rating: { type: Number, default: 5 },
    tripsCount: { type: Number, default: 0 },
    transmission: {
      type: String,
      required: true,
      enum: ["AUTO", "MANUAL"],
      uppercase: true,
    },
    features: {
      type: [String],
      default: [
        "Comprehensive insurance",
        "24/7 road support",
        "Free Cancellation",
        "Unlimited mileage in-city",
        "Sanitize between trips",
        "Full tank at pickup",
      ],
    },
    image: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    carSpecs: {
      engine: String,
      topSpeed: String,
      mileage: String,
      boot: String,
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
