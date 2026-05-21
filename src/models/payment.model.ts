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

<<<<<<< HEAD
const PaymentSchema = new Schema<IPayment>(
  {
  
    paymentId: {
      type: String,
      unique: true,
      required: true,
      default: () =>
        `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    },


    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    carId: {
      type: Schema.Types.ObjectId,
      ref: 'Car',
=======
const paymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
>>>>>>> 94a97da44078b6b26a0697027d5145c7a7af1e98
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
<<<<<<< HEAD
      ref: 'Booking',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'reversed'],
      default: 'pending',
      required: true,
    },
    reference: {
      type: String,
      unique: true,
      required: true,//necessary for preventing duplicate processing and for audit trails
    },
=======
      ref: "Booking",
      required: true,
    },
    carId: {
      type: Schema.Types.ObjectId,
      ref: "Car",
      required: true,
    },
>>>>>>> 94a97da44078b6b26a0697027d5145c7a7af1e98
    amount: {
      type: Number,
      required: true,
    },
<<<<<<< HEAD
    paidAt: {
      type: Date,
      default: null,
    },
    currency: {
      type: String,
      default: 'NGN',
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: [ 'Pay_with_Paystack','Pay_with_Bank_Transfer'],
      default:"Pay_with_Paystack",
      required: true,
    },
    paystackDetails:{
      type: Schema.Types.Mixed, // Stores the full verification object for future disputes

    }
  },
  {
    timestamps: true,
  }
);


PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ bookingId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ reference: 1 });

const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;





=======
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
>>>>>>> 94a97da44078b6b26a0697027d5145c7a7af1e98
