import mongoose, { Schema, Document } from "mongoose";

export interface UserCar extends Document {
  brand: string;
  description: string;
  segment:
    | "EXECUTIVE"
    | "LOGISTICS"
    | "FAMILY"
    | "CITY"
    | "PREMIUM"
    | "ELECTRIC";
  tags: ("CITY" | "BEST SELLER" | "ECONOMY" | "POPULAR")[]; // ["BEST SELLER", "ECONOMY"]
  category: string;
  modelName: string;
  year: number;
  pricePerDay: number;
  seats: number;
  fuelType: string;
  features: string[];
  transmission: "Auto" | "Manual" | string;
  image: {
    url: string;
    public_id: string;
  }[];
  rating: number;
  tripsCount: number;
  carSpecs: {
    engine: string; // 3.5L V6
    topSpeed: string; // 230 km/h
    mileage: string; // 22 km/L
    boot: string; // 454 L
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
    description: {
      type: String,
      required: [true, "Please provide a description for the car"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    segment: {
      type: String,
      required: true,
      uppercase: true,
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
    year: { type: Number, required: true },
    tags: {
      type: [String],
      required: true,
      uppercase: true,
      enum: ["CITY", "BEST SELLER", "ECONOMY", "POPULAR"],
      default: ["POPULAR"],
    },
    pricePerDay: {
      type: Number,
      required: true,
      min: [0, "Price per day cannot be negative"],
    },
    seats: {
      type: Number,
      required: true,
      min: [1, "Seat must be at least 1"],
    },
    fuelType: {
      type: String,
      required: true,
      trim: true,
    },
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
