import mongoose, { Document, Schema } from 'mongoose';


export interface IPayment extends Document {
  paymentId: string;
  userId: mongoose.Types.ObjectId;
  carId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  status: 'pending'| 'success' | 'failed' | 'reversed';
  reference: string;// The unique RF-XXXX reference generated in your service
  amount: number;
  paystackDetails?: any; // To store raw response from Paystack for audit trails
  paidAt: Date | null;
  currency: string;
  paymentMethod: 'Pay_with_Paystack' | 'Pay_with_Bank_Transfer' ;
  createdAt: Date;
  updatedAt: Date;
}

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
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
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
    amount: {
      type: Number,
      required: true,
    },
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





