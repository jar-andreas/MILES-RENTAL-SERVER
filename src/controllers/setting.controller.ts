import User from "../models/user.model.js";
import { Request, Response } from "express";
import tryCatchWrapper from "../lib/tryCatchWrapper.js";
import { sendTsRestError, sendTsRestSuccess } from "../lib/responseHandler.js";
import bcrypt from "bcrypt";
import logger from "../config/logger.js";

export const updateAdmin = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const adminId = req.session?.userId;

    if (!adminId) {
      return sendTsRestError(res, 401, "Not authenticated");
    }

    const { firstName, lastName, email, password, phone } = req.body;

    const admin = await User.findById(adminId);

    if (!admin) {
      return sendTsRestError(res, 404, "Admin not found");
    }

    if (admin.role !== "admin") {
      return sendTsRestError(res, 403, "User is not an admin");
    }

    if (firstName) admin.firstName = firstName;
    if (lastName) admin.lastName = lastName;
    if (email) admin.email = email;
    if (phone) admin.phone = phone;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(password, salt);
    }

    await admin.save();

    return sendTsRestSuccess(res, 200, {
      message: "Admin updated successfully",
      data: admin,
    });
  },
);

export const deleteAdmin = tryCatchWrapper(
  async (req: Request, res: Response) => {
    const adminId = req.session?.userId;

    if (!adminId) {
      return sendTsRestError(res, 401, "Not authenticated");
    }

    const admin = await User.findById(adminId);

    if (!admin) {
      return sendTsRestError(res, 404, "Admin not found");
    }

    if (admin.role !== "admin") {
      return sendTsRestError(res, 403, "User is not an admin");
    }

    await admin.deleteOne();

    // 🌟 FIX: Wrap the success response inside the session destroy callback
    // to guarantee the client cookie/session is wiped before the response finishes.
    req.session.destroy((err) => {
      if (err) {
        logger.error("Failed to destroy admin workspace session:", err);
        return sendTsRestError(
          res,
          500,
          "Error clearing active session context",
        );
      }

      // Clear the session cookie from the user's browser completely
      res.clearCookie("sessionId"); // Replace "connect.sid" with your actual session cookie name if custom

      return sendTsRestSuccess(res, 200, "Admin deleted successfully");
    });
  },
);
