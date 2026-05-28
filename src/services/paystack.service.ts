import crypto from "crypto";
import { env } from "../config/keys.js";
import logger from "../config/logger.js";
import { getPaystack } from "../config/paystack.config.js";
import { IUser } from "../models/user.model.js";
import { sendPaymentSuccessEmail } from "../email/send-email.js";

//(Input to start payment)
export interface InitializePaymentData {
  amount: number;
  paymentMethod: "paystack";
  bookingId: string;
  carId: string;
  slug: string;
}

//object containing the transaction reference
export interface VerifyPaymentData {
  reference: string;
}
//blueprint for the data your server expects to receive back from Paystack's API after a transaction is processed (The verification result)
export interface PaystackSubscriptionResponse {
  status: boolean;
  message: string;
  data: {
    id: string;
    customer: string;
    plan: string;
    amount: number;
    status: string;
    created_at: string;
  };
}

//Defines what Paystack sends back, specifically the authorization_url and reference (The initialization result)
export interface PaystackCreateResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string; // The URL you send to the frontend
    access_code: string;
    reference: string; // The unique ID you generated
  };
}

//sometimes users close their browser before the "Verify" redirect happens. Paystack sends a Webhook (POST request to your server) to tell you the payment was successful (For background updates)
export interface PaystackWebhookPayload {
  event: "charge.success";
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    metadata: {
      bookingId: string; // This links back to your Car Booking
      userId: string;
    };
    customer: {
      email: string;
    };
  };
}

export class PaystackService {
  async InitializePayment(
    data: InitializePaymentData,
    user: IUser,
  ): Promise<PaystackCreateResponse> {
    try {
      // Convert to Kobo (Paystack requirement)
      const amountInKobo = data.amount * 100;
      // Generate a unique reference
      const reference = `RF-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${Date.now().toString().slice(-4)}`;

      logger.info(`Initializing payment for booking: ${data.bookingId}`);

      const response = await getPaystack().post("/transaction/initialize", {
        email: user.email,
        amount: amountInKobo,
        reference,
        metadata: {
          userId: user._id,
          paymentMethod: data.paymentMethod,
          bookingId: data.bookingId,
          carId: data.carId,
        },
        // Point this to your frontend verification route
        callback_url: `${env.CLIENT_URL}/verify-payment?reference=${reference}&slug=${data.slug}`,
      });
      return response.data;
    } catch (error: any) {
      logger.error(
        "Paystack Initialization Error:",
        error.response?.data || error.message,
      );
      throw new Error(
        error.response?.data?.message || "Failed to initialize payment",
      );
    }
  }
  async VerifyPayment(data: VerifyPaymentData): Promise<any> {
    try {
      // 1. Verify the transaction with Paystack
      const response = await getPaystack().get(
        `/transaction/verify/${data.reference}`,
      );

      // 2. Security Check: Only proceed if status is 'success'
      if (response.data.status && response.data.data.status === "success") {
        const tx = response.data.data;
        const metadata = tx.metadata;

        // Dynamic imports to prevent circular dependencies
        const Payment = (await import("../models/payment.model.js")).default;
        const Booking = (await import("../models/booking.model.js")).default;
        const Car = (await import("../models/car.model.js")).default;

        const paymentUpdate = {
          userId: metadata.userId,
          bookingId: metadata.bookingId,
          carId: metadata.carId,
          paymentMethod: metadata.paymentMethod,
          amount: tx.amount / 100,
          status: "success" as const,
          reference: tx.reference,
          paidAt: new Date(),
          paystackDetails: tx,
        };

        // 1. Update/Create Payment Record
        const payment = await Payment.findOneAndUpdate(
          { reference: tx.reference },
          paymentUpdate,
          { upsert: true, returnDocument: "after" },
        );

        // 2. Update Booking & Car Status (Tying the relationship here! 🌟)
        await Booking.findByIdAndUpdate(metadata.bookingId, {
          payment: payment?._id, // ✅ THIS SEALS THE LINK FOR YOUR POPULATE CALL!
          paymentStatus: "Paid",
          bookingStatus: "Confirmed",
        });

        await Car.findByIdAndUpdate(
          metadata.carId,
          { status: "booked" },
          { new: true, runValidators: true },
        );

        // 3. Trigger the email side-effect
        if (payment) {
          await this._triggerPaymentConfirmation(
            payment.userId.toString(),
            tx.amount / 100,
            tx.reference,
          );
        }
        return payment;
      }
      throw new Error("Payment verification failed");
    } catch (error: any) {
      logger.error("Payment Verification Error:", error.message);
      throw error;
    }
  }
  /**
   * Private Side-Effect Handler: Finds user and sends Brevo email
   */
  private async _triggerPaymentConfirmation(
    userId: string,
    amount: number,
    ref: string,
  ): Promise<void> {
    try {
      const User = (await import("../models/user.model.js")).default;
      const user = await User.findById(userId);

      if (!user) {
        logger.warn(`Email skip: User ${userId} not found.`);
        return;
      }

      await sendPaymentSuccessEmail(
        user.email,
        `${user.firstName} ${user.lastName}` || "Miles Customer",
        amount,
        ref,
      );

      logger.info(`Payment confirmation email sent via Brevo to ${user.email}`);
    } catch (error: any) {
      logger.error("Side-effect failed (Email not sent):", error.message);
    }
  }
  //Implement the Webhook Handler:
  async handleWebhook(payload: PaystackWebhookPayload): Promise<void> {
    if (payload.event === "charge.success") {
      // Reuse your VerifyPayment logic here to update DB and send email

      await this.VerifyPayment({ reference: payload.data.reference });
      logger.info(`Webhook processed for ref: ${payload.data.reference}`);
    }
  }
}
