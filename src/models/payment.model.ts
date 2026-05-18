import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
    userId: mongoose.Types.ObjectId; 
    bookingId: mongoose.Types.ObjectId;
    carId: mongoose.Types.ObjectId;
    amount: number;
    currency: string;
    paymentMethod: 'Pay_with_paystack' | 'Pay_with_bank_transfer' | string;
    status: 'Pending' | 'Completed' | 'Failed' | string;
    reference: string;
    paystackResponse?: any; // Store the full response from Paystack for future reference
    paidAt?: Date; // Timestamp for when the payment was completed
    createdAt: Date;
    updatedAt: Date;
}

const PaymentSchema: Schema<IPayment> = new Schema({
    userId: {
        type: mongoose.Types.ObjectId, 
        required: true,
        ref: 'User'
    },
    bookingId: {
        type: mongoose.Types.ObjectId, 
        required: true,
        ref: 'Booking'
    },
    carId: {
        type: mongoose.Types.ObjectId,
        required: true,
        ref: 'Car'
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'Amount must be a positive number']
    },
    currency: {
        type: String,
        required: true,
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['Pay_with_paystack', 'Pay_with_bank_transfer']
    },
    status: {
        type: String,
        required: true,
        enum: ['Pending', 'Completed', 'Failed']
    },
    reference: {
        type: String,
        required: true,
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    paidAt: {
        type: Date
    }
});

const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);

export default Payment;