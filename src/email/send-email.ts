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