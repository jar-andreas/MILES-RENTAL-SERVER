import mongoose, { Schema, Document } from "mongoose";

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  carId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  paymentMethod: "Pay_with_Paystack" | "Pay_with_Bank_Transfer";
  status: "pending" | "success" | "failed" | "reversed";
  reference: string; // The unique RF-XXXX reference generated in your service
  paystackDetails?: any; // To store raw response from Paystack for audit trails
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    carId: {
      type: Schema.Types.ObjectId,
      ref: "Car",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "NGN",
    },
    paymentMethod: {
      type: String,
      enum: ["Pay_with_Paystack", "Pay_with_Bank_Transfer"],
      default: "Pay_with_Paystack",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "reversed"],
      default: "pending",
      required: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true, // Critical for preventing duplicate processing
    },
    paystackDetails: {
      type: Schema.Types.Mixed, // Stores the full verification object for future disputes
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);


paymentSchema.index({ status: 1 });
paymentSchema.index({ userId: 1, bookingId: 1 });

const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
export default Payment;
