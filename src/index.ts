#!/usr/bin/env node

/**
 * Interactive CLI for PR code reviews
 *
 * Usage: ./agent <pr-identifier> [--non-interactive]
 */

import { stdin, stdout } from "node:process";
import * as readline from "node:readline/promises";
import { query } from "@anthropic-ai/claude-agent-sdk";
import { config } from "dotenv";
import type { MarkedExtension } from "marked";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { extractReviewers, formatPRForAgent, GitHubClient } from "./github.js";

config();
marked.use(markedTerminal() as MarkedExtension);

const args = process.argv.slice(2);
const prIdentifier = args.find((arg) => !arg.startsWith("--"));
const isInteractive = !args.includes("--non-interactive");

if (!prIdentifier || args.some((arg) => ["-h", "--help"].includes(arg))) {
	console.log(`
Code Review Agent

Usage: ./agent <pr-identifier> [--non-interactive]

Examples:
  ./agent facebook/react#12345
  ./agent owner/repo#123 --non-interactive
  ./agent https://github.com/owner/repo/pull/123

Options:
  --non-interactive    Skip prompts (for CI/CD)
  -h, --help          Show this help
`);
	process.exit(prIdentifier ? 0 : 1);
}

const SYSTEM_PROMPT = `You are a code review assistant analyzing a GitHub pull request.

Use the code-review-assistant skill to:
1. Recommend appropriate reviewers based on code changes
2. Detect issues against coding standards
3. Generate visual explanations for complex changes
4. Provide a comprehensive review

Be thorough but concise. Focus on actionable feedback.

IMPORTANT: Do NOT ask about auto-assigning reviewers or posting comments.
The agent handles these actions. Simply present the final review.`;

async function main() {
	const token = process.env.GITHUB_TOKEN;
	if (!token) throw new Error("GITHUB_TOKEN environment variable required");

	if (!prIdentifier) throw new Error("PR identifier is required");

	const github = new GitHubClient(token);
	const pr = await github.fetchPR(prIdentifier);

	console.log("=".repeat(80));
	console.log(`Analyzing PR #${pr.number}: ${pr.title}`);
	console.log("=".repeat(80));
	console.log();

	let fullReview = "";

	for await (const message of query({
		prompt: `Please review this pull request:\n\n${formatPRForAgent(pr)}`,
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
		if (
			(message.type === "assistant" || message.type === "user") &&
			message.message
		) {
			const content = message.message.content.find(
				(c: { type: string }) => c.type === "text",
			);
			if (content && "text" in content) {
				const text = (content as { text: string }).text;
				if (!text.includes("## 📋 PR Summary")) {
					process.stdout.write(text.endsWith("\n") ? text : text + "\n");
				}
			}
		}

		if (message.type === "result" && "result" in message) {
			fullReview = message.result as string;
		}
	}

	if (!fullReview) return;

	const summaryStart = fullReview.indexOf("## 📋 PR Summary");
	const review =
		summaryStart !== -1 ? fullReview.substring(summaryStart) : fullReview;

	console.log("\n\n" + "=".repeat(80));
	console.log("Review Complete");
	console.log("=".repeat(80));
	console.log(marked.parse(review));

	const reviewers = extractReviewers(fullReview);
	if (isInteractive && reviewers.length > 0) {
		await promptActions(github, pr.number, reviewers, review);
	}
}

async function promptActions(
	github: GitHubClient,
	prNumber: number,
	reviewers: string[],
	review: string,
) {
	const rl = readline.createInterface({ input: stdin, output: stdout });

	try {
		console.log("\n" + "─".repeat(80));
		console.log(
			`\n✓ Found ${reviewers.length} reviewer${reviewers.length > 1 ? "s" : ""}: ${reviewers.map((r) => `@${r}`).join(", ")}`,
		);

		const assignAnswer = await rl.question(
			"\nAuto-assign these reviewers? (y/N): ",
		);
		if (
			assignAnswer.toLowerCase() === "y" ||
			assignAnswer.toLowerCase() === "yes"
		) {
			console.log(`\n▶ Assigning reviewers...`);
			await github.assignReviewers(prNumber, reviewers);
			console.log(`✓ Assigned: ${reviewers.map((r) => `@${r}`).join(", ")}`);
		}

		const commentAnswer = await rl.question(
			"\nPost review as PR comment? (y/N): ",
		);
		if (
			commentAnswer.toLowerCase() === "y" ||
			commentAnswer.toLowerCase() === "yes"
		) {
			console.log(`\n▶ Posting comment...`);
			await github.postComment(prNumber, review);
			console.log(`✓ Comment posted to PR #${prNumber}`);
		}

		console.log();
	} finally {
		rl.close();
	}
}

main().catch((error) => {
	console.error("\n✗ Error:", error.message);
	process.exit(1);
});
