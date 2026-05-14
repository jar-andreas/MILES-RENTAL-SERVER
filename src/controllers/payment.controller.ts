import { PaystackService } from "../services/paystack.service.js";
import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { Request, Response } from "express";
import { sendTsRestError, sendTsRestSuccess } from "../lib/responseHandler.js";
import User from "../models/user.model.js";

const paystackService = new PaystackService();

//initializes a transaction and returns the Paystack checkout URL

export const initializePayment = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const userId = req.session.userId;
    // 1. Safety Check: If no user, stop here and return 401
    if (!userId) {
      return sendTsRestError(res, 401, "Authentication required to book a car");
    }

    // 1. Fetch the actual user document
    const user = await User.findById(userId);
    if (!user) {
      return sendTsRestError(res, 404, "User profile not found");
    }

    // 2. Pass the full user object to the service
    const result = await paystackService.InitializePayment(req.body, user);
    return sendTsRestSuccess(res, 200, {
      success: true,
      message: "Payment link generated successfully",
      data: result.data,
    });
  },
);

export const verifyPayment = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const { reference } = req.query;

    if (!reference) {
      return sendTsRestError(res, 400, "Transaction reference is required");
    }

    const payment = await paystackService.VerifyPayment({
      reference: reference as string,
    });

    return sendTsRestSuccess(res, 200, {
      message: "Payment verified successfully",
      data: payment,
    });
  },
);

// Webhooks are usually handled outside the wrapper or with a 200 response
// regardless of internal logic to stop Paystack from retrying.
export const handlePaystackWebhook = async (req: Request, res: Response) => {
  try {
    await paystackService.handleWebhook(req.body);
    res.status(200).send("Webhook Received");
  } catch (error: any) {
    res.status(200).send("Webhook failed internally, but received");
  }
};
