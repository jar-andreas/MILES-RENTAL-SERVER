import { env } from "src/config/keys.js";
import logger from "src/config/logger.js";
 
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
 
export const sendEmail = async (options: SendEmailOptions): Promise<boolean> => {
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
 
    const data = await response.json() as BrevoResponse;
logger.info({ messageId: data.messageId, to: options.to }, "Email sent successfully");
    return true;
  } catch (error) {
    logger.error({ error }, "Email service error");
    return false;
  }
};
 
export const sendOtpEmail = async (
  to: string,
  toName: string,
  otp: string
): Promise<boolean> => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Password Reset OTP</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <!-- Header -->
                <tr>
                  <td style="background-color:#F97316;padding:32px 40px;text-align:center;">
                    <h1 style="color:#ffffff;margin:0;font-size:26px;letter-spacing:1px;">miles.</h1>
                    <p style="color:#ffe0cc;margin:6px 0 0;font-size:13px;">CAR RENTAL</p>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:40px;">
                    <h2 style="color:#1a1a1a;margin:0 0 12px;">Password Reset Request</h2>
                    <p style="color:#555;font-size:15px;line-height:1.6;margin:0 0 24px;">
                      Hi ${toName}, we received a request to reset your password. Use the OTP code below. It expires in <strong>10 minutes</strong>.
                    </p>
                    <!-- OTP Box -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding:24px 0;">
                          <div style="display:inline-block;background-color:#fff7ed;border:2px dashed #F97316;border-radius:12px;padding:20px 48px;">
                            <span style="font-size:42px;font-weight:bold;color:#F97316;letter-spacing:12px;">${otp}</span>
                          </div>
                        </td>
                      </tr>
                    </table>
                    <p style="color:#888;font-size:13px;margin:16px 0 0;">
                      If you didn't request this, you can safely ignore this email. Your password will not change.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
                    <p style="color:#aaa;font-size:12px;margin:0;">© ${new Date().getFullYear()} Miles Car Rental. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
 
  return sendEmail({
    to,
    toName,
    subject: "Your Miles Rental Password Reset OTP",
    htmlContent,
    textContent: `Your OTP code is: ${otp}. It expires in 10 minutes.`,
  });
};