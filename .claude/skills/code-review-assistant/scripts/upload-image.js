#!/usr/bin/env node

/**
 * Upload Image to Cloudinary
 * Usage: node upload-image.js <image-path>
 * Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env
 */
import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";
import { findUpSync } from "find-up";

const envPath = findUpSync(".env");
if (envPath) config({ path: envPath });

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

const imagePath = process.argv[2];
if (!imagePath) {
	console.error("Usage: node upload-image.js <path-to-image-file>");
	process.exit(1);
}

const result = await cloudinary.uploader
	.upload(imagePath)
	.catch((error) => {
		console.error("Upload failed:", error.message);
		process.exit(1);
	});

console.log(result.secure_url);
