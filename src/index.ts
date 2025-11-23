#!/usr/bin/env node

/**
 * Code Review Agent CLI
 *
 * Uses the Anthropic Agent SDK to analyze pull requests with the code-review-assistant skill
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { config } from "dotenv";
import { formatPRDataForAgent, GitHubClient } from "./github.js";
import type { AgentMessage, CLIOptions } from "./types.js";

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse CLI arguments with modern patterns
function parseArgs(): CLIOptions {
	const args = process.argv.slice(2);

	const options: CLIOptions = {
		pr: "",
		postComment: false,
		help: false,
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (!arg) continue;

		switch (arg) {
			case "--help":
			case "-h":
				options.help = true;
				break;
			case "--pr": {
				const nextArg = args[++i];
				if (nextArg) options.pr = nextArg;
				break;
			}
			case "--post-comment":
				options.postComment = true;
				break;
			default:
				// Assume it's the PR identifier if no --pr flag
				if (!arg.startsWith("-") && !options.pr) {
					options.pr = arg;
				}
		}
	}

	return options;
}

const HELP_TEXT = `
Code Review Agent - Automated PR Analysis

Usage:
  npm start -- --pr <pr-identifier> [options]

Arguments:
  --pr <identifier>    PR to review. Formats:
                       - https://github.com/owner/repo/pull/123
                       - owner/repo#123
                       - owner/repo/pull/123

Options:
  --post-comment       Post the review as a comment on the PR
  --help, -h           Show this help message

Examples:
  # Analyze a PR
  npm start -- --pr "facebook/react#12345"

  # Analyze and post review comment
  npm start -- --pr "https://github.com/owner/repo/pull/123" --post-comment

Environment Variables:
  ANTHROPIC_API_KEY    Required - Your Anthropic API key
  GITHUB_TOKEN         Required - GitHub personal access token
  GEMINI_API_KEY       Optional - For diagram generation
  CLOUDINARY_*         Optional - For image uploads

Setup:
  1. Copy .env.example to .env
  2. Add your API keys
  3. Run: npm install
  4. Run: npm start -- --pr "owner/repo#123"
`;

function validateEnvironment(): void {
	const requiredVars = [
		{
			key: "ANTHROPIC_API_KEY",
			url: "https://console.anthropic.com/",
			placeholder: "your_anthropic_api_key_here",
		},
		{
			key: "GITHUB_TOKEN",
			url: "https://github.com/settings/tokens",
			placeholder: "your_github_token_here",
		},
	] as const;

	for (const { key, url, placeholder } of requiredVars) {
		const value = process.env[key];
		if (!value || value === placeholder) {
			console.error(`Error: ${key} is not set`);
			console.error(`Get your API key from: ${url}`);
			process.exit(1);
		}
	}
}

const SYSTEM_PROMPT = `You are a code review assistant analyzing a GitHub pull request.

Use the code-review-assistant skill to:
1. Assign appropriate reviewers based on the code changes
2. Detect potential issues against company coding standards
3. Generate visual explanations for complex changes if needed
4. Provide a comprehensive review

Be thorough but concise. Focus on actionable feedback.`;

async function runReview(
	prIdentifier: string,
	skillPath: string,
	githubToken: string,
): Promise<string> {
	const github = new GitHubClient(githubToken);
	const prData = await github.fetchPR(prIdentifier);

	console.log();
	console.log("=".repeat(80));
	console.log("Initializing AI Review with Claude Agent SDK");
	console.log("=".repeat(80));
	console.log();

	const prDataFormatted = formatPRDataForAgent(prData);

	console.log(`Using skill: ${skillPath}\n`);

	let fullReview = "";
	let hasError = false;

	for await (const message of query({
		prompt: `Please review this pull request using the code-review-assistant skill:\n\n${prDataFormatted}`,
		options: {
			plugins: [{ type: "local", path: skillPath }],
			settingSources: [], // Isolation
			systemPrompt: SYSTEM_PROMPT,
			model: "claude-sonnet-4-20250514",
			includePartialMessages: false,
			env: process.env as Record<string, string>,
		},
	})) {
		const msg = message as AgentMessage;

		// Handle streaming messages with proper type checking
		if (msg.type === "text" && msg.text) {
			process.stdout.write(msg.text);
			fullReview += msg.text;
		} else if (msg.type === "tool_use" && msg.name) {
			console.log(`\n[Using tool: ${msg.name}]`);
		} else if (msg.type === "error" && msg.error) {
			console.error("\n\nError during review:", msg.error);
			hasError = true;
		}
	}

	if (hasError) {
		console.log("\n\n⚠️  Review completed with errors");
		process.exit(1);
	}

	return fullReview;
}

async function main(): Promise<void> {
	const options = parseArgs();

	if (options.help) {
		console.log(HELP_TEXT);
		process.exit(0);
	}

	if (!options.pr) {
		console.error("Error: PR identifier is required\n");
		console.log(HELP_TEXT);
		process.exit(1);
	}

	validateEnvironment();

	const githubToken = process.env.GITHUB_TOKEN as string;

	try {
		console.log("=".repeat(80));
		console.log("Code Review Agent - Starting Analysis");
		console.log("=".repeat(80));
		console.log();

		const skillPath = resolve(
			__dirname,
			"../.claude/skills/code-review-assistant",
		);

		const fullReview = await runReview(options.pr, skillPath, githubToken);

		console.log("\n\n" + "=".repeat(80));
		console.log("Review Complete");
		console.log("=".repeat(80));

		// Optionally post comment
		if (options.postComment) {
			console.log("\nPosting review as PR comment...");

			try {
				const github = new GitHubClient(githubToken);
				await github.postComment(options.pr, fullReview);
				console.log("✓ Review posted successfully!");
			} catch (error) {
				const err = error as Error;
				console.error("✗ Failed to post comment:", err.message);
				console.log("\nReview content (save manually if needed):");
				console.log("-".repeat(80));
				console.log(fullReview);
				console.log("-".repeat(80));
				process.exit(1);
			}
		}

		console.log("\n✓ Analysis complete!");
	} catch (error) {
		const err = error as Error;
		console.error("\n✗ Error:", err.message);

		if (err.stack) {
			console.error("\nStack trace:");
			console.error(err.stack);
		}

		process.exit(1);
	}
}

// Run the CLI
main().catch((error: Error) => {
	console.error("Unexpected error:", error);
	process.exit(1);
});

