/**
 * GitHub API Integration
 *
 * Fetches pull request data from GitHub using Octokit
 */

import { Octokit } from "@octokit/rest";
import type { PRData, PRFile } from "./types.js";

interface ParsedPR {
	owner: string;
	repo: string;
	number: number;
}

export class GitHubClient {
	private readonly octokit: Octokit;

	constructor(token: string) {
		if (!token || token === "your_github_token_here") {
			throw new Error(
				"GitHub token is required. Set GITHUB_TOKEN environment variable.\n" +
					"Create a token at: https://github.com/settings/tokens\n" +
					'Needs "repo" scope for private repos, "public_repo" for public repos.',
			);
		}

		this.octokit = new Octokit({ auth: token });
	}

	/**
	 * Parse PR URL or shorthand into owner, repo, and PR number
	 *
	 * Supports:
	 * - https://github.com/owner/repo/pull/123
	 * - owner/repo#123
	 * - owner/repo/pull/123
	 */
	private parsePRIdentifier(prIdentifier: string): ParsedPR {
		const patterns = [
			// Full URL format
			{
				regex: /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/,
				parse: (m: RegExpMatchArray) => ({
					owner: m[1] as string,
					repo: m[2] as string,
					number: Number.parseInt(m[3] as string, 10),
				}),
			},
			// Shorthand: owner/repo#123
			{
				regex: /^([^/]+)\/([^#]+)#(\d+)$/,
				parse: (m: RegExpMatchArray) => ({
					owner: m[1] as string,
					repo: m[2] as string,
					number: Number.parseInt(m[3] as string, 10),
				}),
			},
			// Alternative shorthand: owner/repo/pull/123
			{
				regex: /^([^/]+)\/([^/]+)\/pull\/(\d+)$/,
				parse: (m: RegExpMatchArray) => ({
					owner: m[1] as string,
					repo: m[2] as string,
					number: Number.parseInt(m[3] as string, 10),
				}),
			},
		];

		for (const { regex, parse } of patterns) {
			const match = prIdentifier.match(regex);
			if (match) return parse(match);
		}

		throw new Error(
			`Invalid PR identifier format: ${prIdentifier}\n` +
				"Supported formats:\n" +
				"  - https://github.com/owner/repo/pull/123\n" +
				"  - owner/repo#123\n" +
				"  - owner/repo/pull/123",
		);
	}

	/**
	 * Fetch PR metadata and diff from GitHub
	 */
	async fetchPR(prIdentifier: string): Promise<PRData> {
		console.log(`Fetching PR: ${prIdentifier}...`);

		const { owner, repo, number } = this.parsePRIdentifier(prIdentifier);

		try {
			// Fetch PR details
			const { data: pr } = await this.octokit.pulls.get({
				owner,
				repo,
				pull_number: number,
			});

			console.log(`✓ Found PR #${number}: ${pr.title}`);
			console.log(`  Author: ${pr.user?.login ?? "unknown"}`);
			console.log(`  Status: ${pr.state}`);

			// Fetch PR files
			const { data: files } = await this.octokit.pulls.listFiles({
				owner,
				repo,
				pull_number: number,
				per_page: 100, // Get up to 100 files
			});

			console.log(`✓ Fetched ${files.length} changed files`);

			// Convert to our PRFile format
			const prFiles: PRFile[] = files.map((file) => ({
				filename: file.filename,
				status: file.status as PRFile["status"],
				additions: file.additions,
				deletions: file.deletions,
				changes: file.changes,
				patch: file.patch,
			}));

			// Construct the full diff from patches
			const diff = files
				.filter((f) => f.patch)
				.map((f) => `diff --git a/${f.filename} b/${f.filename}\n${f.patch}`)
				.join("\n\n");

			console.log(`✓ Generated diff (${diff.length} characters)`);

			return {
				number,
				title: pr.title,
				body: pr.body ?? "",
				author: pr.user?.login ?? "unknown",
				url: pr.html_url,
				files: prFiles,
				diff,
			};
		} catch (error) {
			const err = error as { status?: number; message?: string };

			const errorMessages: Record<number, string> = {
				404:
					`PR not found: ${owner}/${repo}#${number}\n` +
					"Make sure:\n" +
					"  1. The repository and PR number are correct\n" +
					"  2. Your GitHub token has access to this repository\n" +
					"  3. The PR exists and is not deleted",
				401:
					"GitHub authentication failed. Check your GITHUB_TOKEN.\n" +
					"Create a token at: https://github.com/settings/tokens",
				403:
					"GitHub API rate limit exceeded or insufficient permissions.\n" +
					"If rate limited, wait a few minutes. If permissions issue, check token scopes.",
			};

			if (err.status && errorMessages[err.status]) {
				throw new Error(errorMessages[err.status]);
			}

			throw new Error(`Failed to fetch PR: ${err.message ?? "Unknown error"}`);
		}
	}

	/**
	 * Post a comment on the PR
	 */
	async postComment(prIdentifier: string, comment: string): Promise<void> {
		const { owner, repo, number } = this.parsePRIdentifier(prIdentifier);

		try {
			console.log(`\nPosting review comment to PR #${number}...`);

			await this.octokit.issues.createComment({
				owner,
				repo,
				issue_number: number,
				body: comment,
			});

			console.log("✓ Comment posted successfully!");
			console.log(
				`  View at: https://github.com/${owner}/${repo}/pull/${number}`,
			);
		} catch (error) {
			const err = error as Error;
			throw new Error(`Failed to post comment: ${err.message}`);
		}
	}
}

/**
 * Helper function to format PR data for the agent
 */
export function formatPRDataForAgent(prData: PRData): string {
	const filesList = prData.files
		.map((f) => `  - ${f.filename} (+${f.additions}, -${f.deletions})`)
		.join("\n");

	return `
# Pull Request #${prData.number}: ${prData.title}

**Author:** @${prData.author}
**URL:** ${prData.url}

## Description

${prData.body || "(No description provided)"}

## Changed Files

${filesList}

## Full Diff

\`\`\`diff
${prData.diff}
\`\`\`
`.trim();
}
