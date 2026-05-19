import mongoose, { Schema, Document } from "mongoose";

export interface UserBooking extends Document {
  user: mongoose.Types.ObjectId;
  car: mongoose.Types.ObjectId;
  pickupLocation: string;
  returnLocation: string;
  pickupDate: Date;
  returnDate: Date;
  pickupTime: string;
  returnTime: string;
  totalDays: number;
  totalPrice: number;
  driverOption: boolean;
  driverFee: number;
  serviceFee: number;
  bookingStatus:
    | "Pending"
    | "Confirmed"
    | "Cancelled"
    | "Completed"
    | "Ongoing";
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<UserBooking>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    car: {
      type: Schema.Types.ObjectId,
      ref: "Car",
      required: true,
    },

    pickupLocation: {
      type: String,
      required: true,
      trim: true,
    },

    returnLocation: {
      type: String,
      required: true,
      trim: true,
    },

    pickupDate: {
      type: Date,
      required: true,
    },

    returnDate: {
      type: Date,
      required: true,
    },

    pickupTime: {
      type: String,
      required: true,
      trim: true,
    },

    returnTime: {
      type: String,
      required: true,
      trim: true,
    },

    totalDays: {
      type: Number,
      required: true,
    },

    totalPrice: {
      type: Number,
      default: 0,
    },

    driverOption: {
      type: Boolean,
      default: false,
    },

    driverFee: {
      type: Number,
      default: 25,
    },

    serviceFee: {
      type: Number,
      default: 10,
    },

    bookingStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Cancelled", "Completed", "Ongoing"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  },
);

BookingSchema.index({ user: 1 });
BookingSchema.index({ car: 1 });
BookingSchema.index({ bookingStatus: 1 });

const Booking =
  mongoose.models.Booking ||
  mongoose.model<UserBooking>("Booking", BookingSchema, "booking");

export default Booking;
