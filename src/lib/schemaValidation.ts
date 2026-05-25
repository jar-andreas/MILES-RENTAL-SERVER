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
  fullName: z
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

export const validateCreateCarSchema = z.object({
  brand: z
    .string()
    .trim()
    .min(1, { message: "Brand is required" })
    .max(50, { message: "Brand name is too long" }),

  description: z
    .string()
    .trim()
    .min(10, { message: "Description must be at least 10 characters" })
    .max(1000, { message: "Description cannot exceed 1000 characters" }),

  category: z.enum(["LUXURY", "SEDAN", "SUV", "TRUCK"], {
    message: "Invalid category",
  }),

  tags: z
    .array(
      z.enum([
        "CITY",
        "BEST SELLER",
        "ECONOMY",
        "PREMIUM",
        "LOGISTICS",
        "EXECUTIVE",
        "FAMILY",
        "ELECTRIC",
      ]),
    )
    .min(1, { message: "At least one tag is required" }),

  modelName: z
    .string()
    .trim()
    .min(1, { message: "Model name is required" })
    .max(100, { message: "Model name is too long" }),

  year: z
    .number({
      message: "Year must be a number",
    })
    .min(1900, { message: "Invalid year" })
    .max(new Date().getFullYear() + 1, {
      message: "Year cannot be in the far future",
    }),

  pricePerDay: z
    .number({
      message: "Price per day must be a number",
    })
    .min(0, { message: "Price cannot be negative" }),

  seats: z
    .number({
      message: "Seats must be a number",
    })
    .min(1, { message: "Seats must be at least 1" }),

  fuelType: z.string().trim().min(1, { message: "Fuel type is required" }),

  transmission: z.enum(["Auto", "Manual", "Hybrid"], {
    message: "Invalid transmission type",
  }),

  features: z.array(z.string().trim()).optional(),

  images: z
    .array(
      z.object({
        url: z.string().url({
          message: "Invalid image URL",
        }),

        public_id: z
          .string()
          .trim()
          .min(1, { message: "Public ID is required" }),
      }),
    )
    .min(1, { message: "At least one image is required" }),

  rating: z.number().min(0).max(5).optional(),

  tripsCount: z.number().min(0).optional(),

  carSpecs: z.object({
    engine: z.string().trim().min(1, {
      message: "Engine spec is required",
    }),

    topSpeed: z.string().trim().min(1, {
      message: "Top speed is required",
    }),

    mileage: z.string().trim().min(1, {
      message: "Mileage is required",
    }),

    boot: z.string().trim().min(1, {
      message: "Boot capacity is required",
    }),
  }),

  slug: z
    .string()
    .trim()
    .min(1, { message: "Slug is required" })
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug can only contain lowercase letters, numbers, and hyphens",
    }),
});

export const validateBookingSchema = z
  .object({
    car: z.string({ message: "Car is required" }).min(1, "Car is required"),

    pickupLocation: z
      .string({ message: "Pickup location is required" })
      .min(2, "Pickup location must be at least 2 characters")
      .trim(),

    returnLocation: z
      .string({ message: "Return location is required" })
      .min(2, "Return location must be at least 2 characters")
      .trim(),

    pickupDate: z
      .string({ message: "Pickup date is required" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Pickup date must be a valid date",
      })
      .refine(
        (val) => {
          // 1. Cleanly isolate just the YYYY-MM-DD part of the incoming value
          const inputDateString = new Date(val).toISOString().split("T")[0];

          // 2. Get today's calendar date string using your local timezone context
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, "0");
          const day = String(today.getDate()).padStart(2, "0");
          const todayDateString = `${year}-${month}-${day}`;

          // 3. Directly compare strings lexicographically ("2026-05-19" >= "2026-05-19")
          return inputDateString >= todayDateString;
        },
        {
          message: "Pickup date cannot be in the past",
        },
      ),

    returnDate: z
      .string({ message: "Return date is required" })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Return date must be a valid date",
      }),

    pickupTime: z.string({ message: "Pickup time is required" }).optional(),

    returnTime: z.string({ message: "Return time is required" }).optional(),

    driverOption: z.boolean().default(false),
  })
  .refine((data) => new Date(data.returnDate) > new Date(data.pickupDate), {
    message: "Return date must be after pickup date",
    path: ["returnDate"],
  });

// FIXED: Cleaned up the .merge() crash over refinements by destructuring the core shapes safely inside the body block
export const validateAdminNewBookingSchema = z
  .object({
    ...validateBookingSchema.shape,
    fullname: z.string().min(3, "Full name must be at least 3 characters long"),
    phone: z
      .string()
      .min(1, "Phone is required")
      .refine(
        (num) => num === "" || /^\+\d{10,15}$/.test(num),
        "Invalid phone number",
      ),
    email: z
      .string({ message: "Email address is required" })
      .email("Please enter a valid email address")
      .trim()
      .toLowerCase(),
    paymentMethod: z
      .string({ message: "Payment method is required" })
      .refine((val) => val === "Pay_with_Bank_Transfer", {
        message: "Admin bookings must use 'Pay_with_Bank_Transfer' only",
      }),
  })
  .refine((data) => new Date(data.returnDate) > new Date(data.pickupDate), {
    message: "Return date must be after pickup date",
    path: ["returnDate"],
  });

export const validateDriverSchema = z.object({
  fullName: z.string().trim().min(3, {
    message: "Full name must be at least 3 characters long",
  }),

  phoneNumber: z
    .string()
    .trim()
    .min(1, {
      message: "Phone number is required",
    })
    .refine((num) => /^\+\d{10,15}$/.test(num), {
      message: "Invalid phone number",
    }),

  email: z
    .string({
      message: "Email address is required",
    })
    .trim()
    .toLowerCase()
    .email({
      message: "Please enter a valid email address",
    }),

  baseCity: z.string().trim().min(2, {
    message: "Base city is required",
  }),

  yearsOfExperience: z
    .number({
      message: "Years of experience must be a number",
    })
    .min(0, {
      message: "Years of experience cannot be negative",
    })
    .max(60, {
      message: "Invalid years of experience",
    }),

  languages: z
    .array(z.enum(["en", "yoruba", "igbo", "hausa", "fr", "pidgin"]))
    .min(1, { message: "select a language" }),

  licenseNumber: z.string().trim().min(3, {
    message: "License number is required",
  }),

  expiryDate: z
    .string({
      message: "Expiry date is required",
    })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Expiry date must be valid",
    })
    .refine((val) => new Date(val) > new Date(), {
      message: "License expiry date cannot be in the past",
    }),

  isVerified: z.boolean().default(false),

  status: z
    .enum(["available", "on-trip", "off-duty", "inactive"], {
      message: "select a driver status",
    })
    .default("available"),
  trips: z
    .number({
      message: "Trips must be a valid number",
    })
    .min(0, { message: "Trips cannot be negative" })
    .default(0),
});

export const createCarAdminSchema = z.object({
  images: z
    .array(z.string().min(1, "Image is required"))
    .min(1, "At least one image is required"),

  brand: z.string().min(1, "Brand is required"),

  modelName: z.string().min(1, "Model name is required"),

  year: z
    .number()
    .int("Year must be an integer")
    .min(1900, "Year is too old")
    .max(new Date().getFullYear() + 1, "Year is invalid"),

  category: z.string().min(1, "Category is required"),

  seats: z
    .number()
    .int()
    .min(1, "Seats must be at least 1"),

  fuelType: z.string().min(1, "Fuel type is required"),

  transmission: z.string().min(1, "Transmission is required"),

  carSpecs: z.object({
    engine: z.string().optional(),
    topSpeed: z.string().optional(),
    mileage: z.string().optional(),
    boot: z.string().optional(),
  }),

  status: z.string().min(1, "Status is required"),
});