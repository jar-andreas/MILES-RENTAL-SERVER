import ContactInquiry from "src/models/contactUs.model.js";
import { Request, Response, NextFunction } from "express";
import tryCatchWrapper from "src/lib/tryCatchWrapper.js";
import { sendContactInquiry } from "src/lib/email.js";
import { sendTsRestError, sendTsRestSuccess } from "src/lib/responseHandler.js";

export const handleContactInquiry = tryCatchWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const { fullName, email, phone, subject, message } = req.body;
    if (!fullName || !email || !subject || !message) {
      return sendTsRestError(
        res,
        400,
        "All fields except phone number are required.",
      );
    }
    //save newInquiry to database
    const newInquiry = await ContactInquiry.create({
      fullName,
      email,
      phone,
      subject,
      message,
    });
    // 3. Forward to your personal email (The reception)
    const emailSent = await sendContactInquiry(
      fullName,
      email,
      phone,
      subject,
      message,
    );

    if (!emailSent) {
      return sendTsRestSuccess(res, 200, {
        message:
          "Message saved, but notification failed to send. We will check our records.",
        data: newInquiry,
      });
    }
    sendTsRestSuccess(res, 200, {
      message: "Your inquiry has been received! We'll get back to you shortly.",
      data: newInquiry,
    });
  },
);
