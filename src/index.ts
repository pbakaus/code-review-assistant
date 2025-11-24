#!/usr/bin/env node

/**
 * Code Review Agent - Interactive CLI for PR analysis
 *
 * Usage: ./agent <pr-identifier> [--non-interactive]
 * Example: ./agent facebook/react#12345
 */

import { exec } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { promisify } from "node:util";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { config } from "dotenv";
import type { MarkedExtension } from "marked";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { formatPRDataForAgent, GitHubClient } from "./github.js";

const execAsync = promisify(exec);

config();

// Configure marked for terminal output
marked.use(markedTerminal() as MarkedExtension);

// Parse arguments
const args = process.argv.slice(2);
const prIdentifier = args.find((arg) => !arg.startsWith("--"));
const isNonInteractive = args.includes("--non-interactive");

if (
	!prIdentifier ||
	prIdentifier === "--help" ||
	prIdentifier === "-h" ||
	args.includes("--help") ||
	args.includes("-h")
) {
	console.log(`
Code Review Agent

Usage: ./agent <pr-identifier> [--non-interactive]

Examples:
  ./agent facebook/react#12345
  ./agent owner/repo#123 --non-interactive
  ./agent https://github.com/owner/repo/pull/123

Options:
  --non-interactive    Skip interactive prompts (for CI/CD)
  --help, -h          Show this help message
`);
	process.exit(prIdentifier || args.includes("--help") || args.includes("-h") ? 0 : 1);
}

const SYSTEM_PROMPT = `You are a code review assistant analyzing a GitHub pull request.

Use the code-review-assistant skill to analyze the PR. The skill will:
1. Recommend appropriate reviewers based on the code changes
2. Detect potential issues against coding standards
3. Generate visual explanations for complex changes if needed
4. Provide a comprehensive review

Be thorough but concise. Focus on actionable feedback.

IMPORTANT: After presenting your review, do NOT ask about auto-assigning reviewers or posting comments. 
The skill's "Post-Review Actions" section does not apply in this agent context. 
Simply present the final review and exit.`;

async function main(): Promise<void> {
	// Fetch PR data
	const githubToken = process.env.GITHUB_TOKEN;
	if (!githubToken) {
		throw new Error("GITHUB_TOKEN environment variable is required");
	}

	const github = new GitHubClient(githubToken);
	const prData = await github.fetchPR(prIdentifier as string);

	console.log("=".repeat(80));
	console.log(`Analyzing PR #${prData.number}: ${prData.title}`);
	console.log("=".repeat(80));
	console.log();

	const prDataFormatted = formatPRDataForAgent(prData);

	let fullReview = "";
	let recommendedReviewers: string[] = [];

	// Stream messages from the query
	for await (const message of query({
		prompt: `Please review this pull request:\n\n${prDataFormatted}`,
		options: {
			settingSources: ["user", "project"],
			allowedTools: [
				"Skill",
				"Bash",
				"Read",
				"Write",
				"Grep",
				"Glob",
				"WebFetch",
			],
			systemPrompt: SYSTEM_PROMPT,
			model: "claude-haiku-4-5",
			env: process.env as Record<string, string>,
		},
	})) {
		// Phase 1: Stream assistant messages in real-time (but skip the final review)
		if ((message.type === "assistant" || message.type === "user") && message.message) {
			const textContent = message.message.content.find(
				(c: { type: string }) => c.type === "text",
			);
			if (textContent && "text" in textContent) {
				const text = (textContent as { text: string }).text;
				// Skip if this is the final review (contains the PR Summary header)
				if (!text.includes("## 📋 PR Summary")) {
					// Ensure text ends with newline if it doesn't already
					process.stdout.write(text.endsWith("\n") ? text : text + "\n");
				}
			}
		}

		// Phase 2: Capture the final result
		if (message.type === "result" && "result" in message) {
			fullReview = message.result as string;
		}
	}

	// Phase 3: Display the final review with markdown rendering
	if (fullReview) {
		const summaryStart = fullReview.indexOf("## 📋 PR Summary");
		const cleanReview =
			summaryStart !== -1 ? fullReview.substring(summaryStart) : fullReview;

		console.log("\n\n" + "=".repeat(80));
		console.log("Review Complete");
		console.log("=".repeat(80));
		console.log(marked.parse(cleanReview));

		// Extract recommended reviewers from the review
		recommendedReviewers = extractReviewers(fullReview);

		// Phase 4: Interactive prompts (if not in non-interactive mode)
		if (!isNonInteractive && recommendedReviewers.length > 0) {
			await handleInteractivePrompts(
				prData.number,
				recommendedReviewers,
				cleanReview,
			);
		}
	}
}

/**
 * Extract reviewer GitHub usernames from the review text
 */
function extractReviewers(review: string): string[] {
	const reviewerSection = review.match(
		/## 👥 Recommended Reviewers([\s\S]*?)(?=##|$)/,
	);
	if (!reviewerSection?.[1]) return [];

	const usernames: string[] = [];
	const lines = reviewerSection[1].split("\n");

	for (const line of lines) {
		// Match @username pattern
		const match = line.match(/@(\w+)/);
		if (match?.[1]) {
			usernames.push(match[1]);
		}
	}

	return usernames;
}

/**
 * Handle interactive prompts for reviewer assignment and comment posting
 */
async function handleInteractivePrompts(
	prNumber: number,
	reviewers: string[],
	review: string,
): Promise<void> {
	const rl = readline.createInterface({ input, output });

	try {
		// Prompt 1: Auto-assign reviewers
		console.log("\n" + "─".repeat(80));
		console.log(
			`\n✓ Found ${reviewers.length} recommended reviewer${reviewers.length > 1 ? "s" : ""}: ${reviewers.map((r) => `@${r}`).join(", ")}`,
		);
		const assignAnswer = await rl.question(
			"\nWould you like to auto-assign these reviewers? (y/N): ",
		);

		if (
			assignAnswer.toLowerCase() === "y" ||
			assignAnswer.toLowerCase() === "yes"
		) {
			await assignReviewers(prNumber, reviewers);
		}

		// Prompt 2: Post review as comment
		const commentAnswer = await rl.question(
			"\nWould you like to post this review as a PR comment? (y/N): ",
		);

		if (
			commentAnswer.toLowerCase() === "y" ||
			commentAnswer.toLowerCase() === "yes"
		) {
			await postReviewComment(prNumber, review);
		}

		console.log();
	} finally {
		rl.close();
	}
}

/**
 * Assign reviewers to the PR using GitHub CLI
 */
async function assignReviewers(
	prNumber: number,
	reviewers: string[],
): Promise<void> {
	try {
		const reviewerList = reviewers.join(",");
		const command = `gh pr edit ${prNumber} --add-reviewer ${reviewerList}`;

		console.log(`\n▶ Running: ${command}`);
		const { stdout, stderr } = await execAsync(command);

		if (stderr) {
			console.error(`⚠ Warning: ${stderr}`);
		}
		if (stdout) {
			console.log(stdout);
		}
		console.log(
			`✓ Successfully assigned reviewers: ${reviewers.map((r) => `@${r}`).join(", ")}`,
		);
	} catch (error) {
		console.error(
			`✗ Failed to assign reviewers: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Post the review as a PR comment using GitHub CLI
 */
async function postReviewComment(
	prNumber: number,
	review: string,
): Promise<void> {
	const tempFile = `.review-${prNumber}-${Date.now()}.md`;

	try {
		// Write review to temporary file
		writeFileSync(tempFile, review, "utf-8");

		const command = `gh pr comment ${prNumber} --body-file ${tempFile}`;

		console.log(`\n▶ Running: ${command}`);
		const { stdout, stderr } = await execAsync(command);

		if (stderr) {
			console.error(`⚠ Warning: ${stderr}`);
		}
		if (stdout) {
			console.log(stdout);
		}
		console.log(`✓ Successfully posted review comment to PR #${prNumber}`);
	} catch (error) {
		console.error(
			`✗ Failed to post comment: ${error instanceof Error ? error.message : String(error)}`,
		);
	} finally {
		// Clean up temporary file
		try {
			unlinkSync(tempFile);
		} catch {
			// Ignore cleanup errors
		}
	}
}

main().catch((error: Error) => {
	console.error("\n✗ Error:", error.message);
	process.exit(1);
});
