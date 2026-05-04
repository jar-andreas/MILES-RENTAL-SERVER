import { z } from "zod";

export const validateSignUpSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { message: "First name is required" })
    .max(50, { message: "First name is too long" }),
  lastName: z
    .string()
    .trim()
    .min(1, { message: "Last name is required" })
    .max(50, { message: "Last name is too long" }),
  email: z.string().trim().lowercase().email({
    message: "Invalid email address",
  }),
  phone: z
    .string()
    .refine(
      (num) => num === "" || /^\+\d{10,15}$/.test(num),
      "Invalid phone number",
    ),
  password: z
    .string()
    .min(8, {
      message: "Password must be at least 8 characters long",
    })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one upper case letter",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lower case letter",
    })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, {
      message: "Password must contain at least one special character",
    }),
});

export const validateLoginUser = z.object({
  email: z.string().trim().lowercase().email({
    message: "Invalid email address",
  }),
  password: z
    .string()
    .min(8, {
      message: "Password must be at least 8 characters long",
    })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one upper case letter",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lower case letter",
    })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, {
      message: "Password must contain at least one special character",
    }),
});

export const validateForgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email({
    message: "Valid Email is required",
  }),
});

export const validateResendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email({
    message: "Valid Email is required",
  }),
});

export const validateVerifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email({
    message: "Valid email is required",
  }),
  otp: z
    .string()
    .trim()
    .length(6, {
      message: "OTP must be exactly 6 digits",
    })
    .regex(/^\d{6}$/, {
      message: "OTP must contain only 6 digits",
    }),
});

export const validateResetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, {
      message: "Password must be at least 8 characters long",
    })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, {
      message: "Password must contain at least one special character",
    }),
  confirmPassword: z
    .string()
    .min(8, {
      message: "Password must be at least 8 characters long",
    })
    .regex(/[A-Z]/, {
      message: "Password must contain at least one uppercase letter",
    })
    .regex(/[a-z]/, {
      message: "Password must contain at least one lowercase letter",
    })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, {
      message: "Password must contain at least one special character",
    }),
});

export const validateContactUsSchema = z.object({
  fullname: z
    .string()
    .trim()
    .min(2, { message: "Full name must be at least 2 characters" })
    .max(50, { message: "Full name is too long" }),
  email: z
    .string()
    .trim()
    .email({ message: "Invalid email address" })
    .lowercase(),
  phone: z
    .string()
    .refine(
      (num) => num === "" || /^\+\d{10,15}$/.test(num),
      "Invalid phone number",
    ),
  subject: z
    .string()
    .trim()
    .min(5, { message: "Subject must be at least 5 characters" })
    .max(100, { message: "Subject is too long" }),
  message: z
    .string()
    .trim()
    .min(10, { message: "Message must be at least 10 characters" })
    .max(1000, { message: "Message cannot exceed 1000 characters" }),
});
