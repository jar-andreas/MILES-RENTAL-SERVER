import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
  UploadApiOptions,
} from "cloudinary";
import { env } from "src/config/keys.js";

interface CloudinaryUploadResult {
  url: string;
  public_id: string;
}
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (
  file: string,
  options: UploadApiOptions = {},
): Promise<CloudinaryUploadResult> => {
  try {
    const defaultOptions: UploadApiOptions = {
      folder: "miles-car-rental",
      resource_type: "auto",
      quality_auto: "auto",
      fetch_format: "webp",
      //delivery optimization
      eager: [
        {
          width: 800,
          height: 600,
          crop: "limit",
        },
        {
          width: 400,
          height: 300,
          crop: "limit",
        },
      ],
      //performance optimization
      responsive_breakpoints: {
        create_derived: true,
        transformation: {
          quality: "auto:good",
          fetch_format: "auto",
        },
      },
      secure: true,
      optimize: true,
      ...options,
    };
    const uploadResponse: UploadApiResponse = await cloudinary.uploader.upload(
      file,
      defaultOptions,
    );
    return {
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
    };
  } catch (error) {
    // You can cast the error to the specific Cloudinary error type
    const err = error as UploadApiErrorResponse;
    throw new Error(err.message || "Upload failed");
  }
};

export const deleteFromCloudinary = async (
  public_id: string,
): Promise<{ result: string }> => {
  try {
    const result = await cloudinary.uploader.destroy(public_id);
    if (result.result !== "ok") {
      throw new Error(`Cloudinary delete failed: ${result.result}`);
    }
    return result;
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
    throw new Error("Failed to remove image from cloud storage");
  }
};
