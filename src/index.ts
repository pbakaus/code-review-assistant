#!/usr/bin/env node

/**
 * Code Review Agent - Minimal CLI for PR analysis
 *
 * Usage: ./agent <pr-identifier>
 * Example: ./agent facebook/react#12345
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { config } from "dotenv";
import type { MarkedExtension } from "marked";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { formatPRDataForAgent, GitHubClient } from "./github.js";

config();

// Configure marked for terminal output
marked.use(markedTerminal() as MarkedExtension);

const prIdentifier = process.argv[2] as string | undefined;

if (!prIdentifier || prIdentifier === "--help" || prIdentifier === "-h") {
	console.log(`
Code Review Agent

Usage: ./agent <pr-identifier>

Examples:
  ./agent facebook/react#12345
  ./agent owner/repo#123
  ./agent https://github.com/owner/repo/pull/123
`);
	process.exit(prIdentifier ? 0 : 1);
}

const SYSTEM_PROMPT = `You are a code review assistant analyzing a GitHub pull request.

Use the code-review-assistant skill to analyze the PR. The skill will:
1. Recommend appropriate reviewers based on the code changes
2. Detect potential issues against coding standards
3. Generate visual explanations for complex changes if needed
4. Provide a comprehensive review

Be thorough but concise. Focus on actionable feedback.

After presenting your review, do NOT offer to assign reviewers or post comments - the agent doesn't support interactive user input yet.`;

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
	}
}

main().catch((error: Error) => {
	console.error("\n✗ Error:", error.message);
	process.exit(1);
});
