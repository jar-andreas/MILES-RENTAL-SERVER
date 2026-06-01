// import mongoose, { Schema, Document } from "mongoose";

// // ─────────────────────────────────────────────────────────────────────────────
// // INTERFACE
// // ─────────────────────────────────────────────────────────────────────────────
// export interface IAdminSettings extends Document {
//     // Business Profile
//     legalName: string;
//     tradingName: string;
//     supportEmail: string;
//     supportPhone: string;
//     country: string;
//     timezone: string;
//     currency: string;
//     taxId: string;
//     registeredAddress: string;
//     createdAt: Date;
//     updatedAt: Date;
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // SCHEMA
// // ─────────────────────────────────────────────────────────────────────────────
// const AdminSettingsSchema = new Schema<IAdminSettings>(
//     {
//         legalName: {
//             type: String,
//             required: true,
//             trim: true,
//             maxlength: [150, "Legal name cannot exceed 150 characters"],
//         },

//         tradingName: {
//             type: String,
//             required: true,
//             trim: true,
//             maxlength: [150, "Trading name cannot exceed 150 characters"],
//         },

//         supportEmail: {
//             type: String,
//             required: true,
//             trim: true,
//             lowercase: true,
//             match: [
//                 /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
//                 "Please provide a valid support email address",
//             ],
//         },

//         supportPhone: {
//             type: String,
//             required: true,
//             trim: true,
//         },

//         country: {
//             type: String,
//             required: true,
//             trim: true,
//         },

//         timezone: {
//             type: String,
//             required: true,
//             trim: true,
//         },

//         currency: {
//             type: String,
//             required: true,
//             trim: true,
//         },

//         taxId: {
//             type: String,
//             required: true,
//             trim: true,
//         },

//         registeredAddress: {
//             type: String,
//             required: true,
//             trim: true,
//             maxlength: [500, "Address cannot exceed 500 characters"],
//         },
//     },
//     {
//         timestamps: true,
//     },
// );

// // ─────────────────────────────────────────────────────────────────────────────
// // SINGLETON EXPORT
// // Only one settings document will ever exist for the admin business profile.
// // ─────────────────────────────────────────────────────────────────────────────
// const AdminSettings =
//     mongoose.models.AdminSettings ||
//     mongoose.model<IAdminSettings>(
//         "AdminSettings",
//         AdminSettingsSchema,
//         "admin_settings",
//     );

// export default AdminSettings;
