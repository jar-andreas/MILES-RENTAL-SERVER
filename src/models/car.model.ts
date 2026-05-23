import mongoose, { Schema, Document } from "mongoose";

export interface UserCar extends Document {
  brand: string;
  description: string;
  category: "LUXURY" | "SEDAN" | "SUV" | "TRUCK";
  tags: (
    | "CITY"
    | "BEST SELLER"
    | "ECONOMY"
    | "PREMIUM"
    | "LOGISTICS"
    | "EXECUTIVE"
    | "FAMILY"
    | "ELECTRIC"
  )[];
  modelName: string;
  year: number;
  pricePerDay: number;
  seats: number;
  fuelType: "Petrol" | "Diesel" | "Hybrid" | "Electric" | string;
  features: string[];
  status: "available" | "booked" | "maintenance";
  transmission: "Auto" | "Manual" | "Hybrid" | string;
  images: {
    url: string;
    public_id: string;
  }[];
  rating: number;
  tripsCount: number;
  carSpecs: {
    engine: string;
    topSpeed: string;
    mileage: string;
    boot: string; //
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
    category: {
      type: String,
      required: true,
      uppercase: true,
      enum: ["LUXURY", "SEDAN", "SUV", "TRUCK"],
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
      enum: [
        "CITY",
        "BEST SELLER",
        "ECONOMY",
        "LOGISTICS",
        "PREMIUM",
        "FAMILY",
        "EXECUTIVE",
        "ELECTRIC",
      ],
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
      enum: ["Petrol", "Diesel", "Hybrid", "Electric"],
    },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    tripsCount: { type: Number, required: true, default: 0 },
    transmission: {
      type: String,
      required: true,
      enum: ["Auto", "Manual", "Hybrid"],
      uppercase: true,
    },
    features: {
      type: [String],
      default: [
        "Comprehensive insurance",
        "24/7 road support",
        "Lexus Safety System+ 4.0",
        "Mark Levinson 17-speaker PurePlay Sound",
        "Free Cancellation",
        "Unlimited mileage in-city",
        "Sanitize between trips",
        "Full tank at pickup",
        "Autopilot",
        "Panoramic Roof",
        "Premium Audio",
        "Heated Seats",
        "Wireless Charging",
      ],
    },
    images: [
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
      lowercase: true,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["available", "booked", "maintenance"],
      default: "available", // New cars are available by default
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

CarSchema.index({ brand: 1 });
CarSchema.index({ category: 1 });
CarSchema.index({ pricePerDay: 1 });

const Car =
  mongoose.models.Car || mongoose.model<UserCar>("Car", CarSchema, "car");

export default Car;
