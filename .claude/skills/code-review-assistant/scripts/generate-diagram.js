#!/usr/bin/env node

/**
 * Generate Diagram using Google Gemini API
 * Usage: node generate-diagram.js "<description>"
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";
import { findUpSync } from "find-up";

// Get the directory where THIS script is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = findUpSync(".env");
if (envPath) config({ path: envPath });

const description = process.argv[2];
if (!description) {
	console.error('Usage: node generate-diagram.js "<description>"');
	process.exit(1);
}

const ai = new GoogleGenAI({});

const prompt = `Create a whiteboard-style technical diagram for: ${description}

Style: Hand-drawn whiteboard sketch with boxes, arrows, and labels. Detailed but very clear.`;

const response = await ai.models.generateContent({
	model: "gemini-3-pro-image-preview",
	contents: prompt,
	config: {
		responseModalities: ["IMAGE"],
		imageConfig: {
			aspectRatio: "16:9",
		},
	},
});

for (const part of response.candidates[0].content.parts) {
	if (part.inlineData) {
		const imageData = part.inlineData.data;
		const buffer = Buffer.from(imageData, "base64");
		// Save to diagrams/ folder relative to the skill directory
		const filename = join(
			__dirname,
			"../diagrams",
			`diagram-${Date.now()}.png`,
		);
		writeFileSync(filename, buffer);
		console.log(filename);
		process.exit(0);
	}
}

console.error("No image generated");
process.exit(1);
