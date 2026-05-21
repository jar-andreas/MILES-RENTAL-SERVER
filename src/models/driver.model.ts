import mongoose, { Schema, Document } from "mongoose";
import { string } from "zod";

export interface DriverInfo extends Document {
    booking: mongoose.Types.ObjectId;
    fullName: String;
    phoneNumber: String;
    email: String;
    baseCity: String;
    yearsOfExperience: Number;
    languages: "EN" | "Yoruba" | "Igbo" | "Hausa" | "Fr" | "Pidgin";
    rating: Number;
    trips: Number;
    licenseNumber: String;
    expiryDate: Date;
    isVerified: Boolean;
    status: "Available" | "On-trip" | "Off-duty" | "Inactive";
}

const DriverSchema = new Schema<DriverInfo>(
    {
        booking: {
            type: Schema.Types.ObjectId,
            ref: "Booking",
            required: true,
        },

        fullName: {
            type: String,
            required: true,
        },

        phoneNumber: {
            type: String,
            required: true,
        },

        email: {
            type: String,
            required: true,
        },

        baseCity: {
            type: String,
            required: true,
        },

        yearsOfExperience: {
            type: Number,
            required: true,
        },

        languages: {
            type: String,
            enum : ["En", "Yoruba", "Igbo", "Hausa", "Fr", "Pidgin"],
            required: true,
        },

        rating: {
            type: Number,
            required: true,
            default: 4.5,
        },

        trips: {
            type: Number,
            required: true,
        },

        licenseNumber: {
            type: String,
            required: true,
        },

        expiryDate: {
            type: Date,
            required: true,
        },

        isVerified: {
            type: Boolean,
            required: true,
        },

        status: {
            type: String,
            enum: ["Available", "On-trip", "Off-duty", "Inactive"],
            required: true,
        }
    },
    {
        timestamps: true,
    },
);

DriverSchema.index({ fullName : 1});
DriverSchema.index({ phoneNumber : 1});
DriverSchema.index({ licenseNumber : 1});
DriverSchema.index({ expiryDate : 1});
DriverSchema.index({ languages : 1});
DriverSchema.index({ rating: 1});
DriverSchema.index({ trips: 1});
DriverSchema.index({ status : 1});

const Driver = mongoose.model<DriverInfo>("Driver", DriverSchema);

export default Driver;

