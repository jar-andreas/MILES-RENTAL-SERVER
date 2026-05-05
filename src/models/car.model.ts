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
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

CarSchema.index({ title: 1 });
CarSchema.index({ category: 1 });
CarSchema.index({ type: 1 });
CarSchema.index({ pricePerDay: 1 });

const Car =
    mongoose.models.Car || mongoose.model<UserCar>("Car", CarSchema, "car");

export default Car;
