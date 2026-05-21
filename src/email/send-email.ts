import logger from "../config/logger.js";
import { env } from "../config/keys.js";

interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

interface BrevoResponse {
  messageId?: string;
}

interface ICarTemplate {
  brand: string;
  modelName: string;
  pricePerDay: number;
}

interface BookingEmailOptions {
  userName: string;
  car: ICarTemplate;
  pickupLocation: string;
  returnLocation: string;
  totalDays: number;
  driverOption: boolean;
  rentalTotal: number;
  serviceFee: number;
  driverTotal: number;
  grandTotal: number;
  reference: string;
}

export const sendEmail = async (
  options: SendEmailOptions,
): Promise<boolean> => {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "Miles Rental",
          email: env.EMAIL_OWNER,
        },
        to: [
          {
            email: options.to,
            name: options.toName || options.to,
          },
        ],
        subject: options.subject,
        htmlContent: options.htmlContent,
        textContent: options.textContent,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      logger.error({ error }, "Brevo email send failed");
      return false;
    }

    const data = (await response.json()) as BrevoResponse;
    logger.info(
      { messageId: data.messageId, to: options.to },
      "Email sent successfully",
    );
    return true;
  } catch (error) {
    logger.error({ error }, "Email service error");
    return false;
  }
};

export const sendPaymentSuccessEmail = async (
  to: string,
  toName: string,
  amount: number,
  reference: string,
): Promise<boolean> => {
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
      <h2 style="color: #f39317;">Payment Confirmed!</h2>
      <p>Hi ${toName},</p>
      <p>Your payment for your car booking on <strong>Miles</strong> was successful.</p>
      <hr style="border: none; border-top: 1px solid #f39317;" />
      <div style="background: #f39317; padding: 15px; border-radius: 5px;">
        <p><strong>Amount Paid:</strong> ${amount.toLocaleString()} NGN</p>
        <p><strong>Transaction Reference:</strong> ${reference}</p>
        <p><strong>Status:</strong> Successful</p>
      </div>
      <p>You can view your booking details in your dashboard.</p>
      <p>Safe travels,<br/>The Miles Team</p>
    </div>
  `;

  return sendEmail({
    to,
    toName,
    subject: `Payment Confirmation - ${reference}`,
    htmlContent,
    textContent: `Payment Confirmed! Amount: ${amount} NGN. Ref: ${reference}`,
  });
};

// ─── 3. Admin Manually Created Booking Template Handler ──────────────────

export const sendBookingCreatedEmail = async (
  to: string,
  options: BookingEmailOptions,
): Promise<boolean> => {
  const {
    userName,
    car,
    pickupLocation,
    returnLocation,
    totalDays,
    driverOption,
    rentalTotal,
    serviceFee,
    driverTotal,
    grandTotal,
    reference,
  } = options;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 620px; margin: auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background: #f39317; padding: 24px 32px;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">Booking Confirmation</h1>
        <p style="color: #fff; margin: 4px 0 0; font-size: 14px;">Miles Car Rental</p>
      </div>
      <div style="padding: 28px 32px;">
        <p style="font-size: 15px; color: #374151;">Hi <strong>${userName}</strong>,</p>
        <p style="font-size: 15px; color: #374151;">
          An administrator has created a booking for you on <strong>Miles Rental</strong>.
          Please find the details of your reservation below.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; color: #374151;">
          <tr style="background: #f9fafb;">
            <td style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Vehicle</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${car.brand} ${car.modelName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Pick-up Location</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${pickupLocation}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Return Location</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${returnLocation}</td>
          </tr>
          <tr>
            <td style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Duration</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${totalDays} day${totalDays > 1 ? "s" : ""}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td style="padding: 10px 12px; font-weight: 600; border-bottom: 1px solid #e5e7eb;">Driver</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;">${driverOption === true ? "Yes (included)" : "No"}</td>
          </tr>
        </table>

        <div style="background: #fffbeb; border: 1px solid #f39317; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px; color: #92400e; font-size: 15px;">Cost Breakdown</h3>
          <table style="width: 100%; font-size: 14px; color: #374151;">
            <tr>
              <td style="padding: 4px 0;">Rental (₦${car.pricePerDay.toLocaleString()} × ${totalDays} day${totalDays > 1 ? "s" : ""})</td>
              <td style="text-align: right;">₦${rentalTotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">Service Fee</td>
              <td style="text-align: right;">₦${serviceFee.toLocaleString()}</td>
            </tr>
            ${
              driverTotal > 0
                ? `<tr>
              <td style="padding: 4px 0;">Driver Fee (₦10,000 × ${totalDays} day${totalDays > 1 ? "s" : ""})</td>
              <td style="text-align: right;">₦${driverTotal.toLocaleString()}</td>
            </tr>`
                : ""
            }
            <tr style="border-top: 1px solid #f39317; margin-top: 8px;">
              <td style="padding: 10px 0 4px; font-weight: 700; font-size: 15px;">Grand Total</td>
              <td style="padding: 10px 0 4px; text-align: right; font-weight: 700; font-size: 15px; color: #f39317;">₦${grandTotal.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #6b7280;">
          <strong>Payment Reference:</strong> ${reference}<br/>
          <strong>Booking Status:</strong> Pending
        </p>

        <p style="font-size: 14px; color: #374151;">
          If you have any questions, please contact our support team. We look forward to serving you!
        </p>
        <p style="font-size: 14px; color: #374151;">Safe travels,<br/><strong>The Miles Team</strong></p>
      </div>
      <div style="background: #f9fafb; padding: 16px 32px; text-align: center; font-size: 12px; color: #9ca3af;">
        © ${new Date().getFullYear()} Miles Car Rental. All rights reserved.
      </div>
    </div>
  `;

  return sendEmail({
    to,
    toName: userName,
    subject: `Your Booking is Confirmed – ${car.brand} ${car.modelName} | Ref: ${reference}`,
    htmlContent,
    textContent: `Hi ${userName}, your booking for ${car.brand} ${car.modelName} has been created. Grand Total: ₦${grandTotal.toLocaleString()}. Reference: ${reference}.`,
  });
};