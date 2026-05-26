import { env } from "./src/config/keys.js";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import { connectDB, gracefulShutdown } from "./src/config/database.js";
import logger, { logError } from "./src/config/logger.js";
import {
  setupGlobalErrorHandlers,
  createExpressLogger,
  notFoundRoutes,
  appErrorHandler,
} from "./src/middleware/error.middleware.js";
import { createSessionMiddleware } from "./src/config/session.js";
import userRoutes from "./src/routes/user.routes.js";
import contactRoutes from "./src/routes/contactUs.routes.js";
import carRoutes from "./src/routes/car.routes.js";
import bookingRoutes from "./src/routes/booking.routes.js";
import paymentRoutes from "./src/routes/payment.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";
import driverRoutes from "./src/routes/driver.route.js";
import { globalLimiter } from "./src/middleware/rateLimit.middelware.js";
import { startCleanupPendingBookingsJob } from "./src/jobs/booking.cleanup.jobs.js";

declare global {
  namespace Express {
    interface Request {
      requestTime?: string;
      rawBody?: Buffer;
    }
  }
}

// Extend express-session SessionData interface
declare module "express-session" {
  interface SessionData {
    userId?: string;
    role?: "client" | "admin";
    resetEmail?: string; //set after OTP is verified,cleared after password reset or after 15 minutes (same as OTP expiry time)
  }
}

const app = express();
// Trust first proxy (for production)
app.set("trust proxy", 1);

//global error handler - node js process
setupGlobalErrorHandlers();

// CORS configuration
const allowedOrigins = [
  env.CLIENT_URL,
  "https://earthling-occupant-vagrancy.ngrok-free.dev",
  "http://localhost:4500",
];
if (env.NODE_ENV === "production" && env.CLIENT_URL) {
  if (!allowedOrigins.includes(env.CLIENT_URL)) {
    allowedOrigins.push(env.CLIENT_URL);
  }
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 200,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "ngrok-skip-browser-warning",
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Credentials",
  ],
  exposedHeaders: [
    "Content-Range",
    "X-Content-Range",
    "x-refresh-token",
    "set-cookie",
  ],
};

//rate limit
app.use(globalLimiter);
//Pino HTTP middleware for request logging
app.use(createExpressLogger());
app.use(cors(corsOptions));
app.use((req: Request, res: Response, next: NextFunction) => {
  // Allow credentials
  res.header("Access-Control-Allow-Credentials", "true");
  // Handle preflight
  if (req.method === "OPTIONS") {
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PATCH, DELETE, OPTIONS",
    );
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(204).end();
  }
  next();
});

// Session middleware (after CORS, before body parsers)
app.use(createSessionMiddleware());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.disable("x-powered-by");

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
// Request time middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Health check route
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Server is running",
    environment: env.NODE_ENV,
    timestamp: req.requestTime,
    uptime: process.uptime(),
  });
});

//api routes will be here
app.get("/session", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Session test",
    session: req.session,
  });
});

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/contact", contactRoutes);
app.use("/api/v1/car", carRoutes);
app.use("/api/v1/booking", bookingRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/driver", driverRoutes);

// Handle 404
app.use(notFoundRoutes);
// Global error handler (adapted for ts-rest)
app.use(appErrorHandler);

// Server configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3700;

const startServer = async (): Promise<void> => {
  let server: any;
  try {
    await connectDB();

    // Start email retry cron job
    // startEmailRetryJob();

    // 🚀 2. Start the cron engine immediately after database verification succeeds!
    startCleanupPendingBookingsJob();
    server = app.listen(PORT, "0.0.0.0", () => {
      logger.info(
        `\n✅ Server running in ${env.NODE_ENV} mode on port ${PORT}`,
      );
      logger.info(`🌐 http://localhost:${PORT}\n`);
    });
    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason: unknown) => {
      console.error("\n❌ UNHANDLED REJECTION! Shutting down...");

      const error =
        reason instanceof Error
          ? `${reason.name}: ${reason.message}`
          : String(reason);

      logger.error({ reason: error }, "Unhandled rejection");

      // Close server gracefully
      server.close(() => {
        logger.info("💥 Process terminated due to unhandled rejection");
        logger.info("✅ Server shutdown complete");
        // Stop cron jobs
        // stopEmailRetryJob();
        process.exit(0);
      });
    });

    // Handle termination signals
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);

    // Handle any other errors
    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.syscall !== "listen") throw error;

      switch (error.code) {
        case "EACCES":
          logger.error(`Port ${PORT} requires elevated privileges`);
          process.exit(1);
        case "EADDRINUSE":
          logger.error(`Port ${PORT} is already in use`);
          process.exit(1);
        default:
          throw error;
      }
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logError(`\n❌ Failed to start server: ${errorMessage}`);
    process.exit(1);
  }
};

startServer();
