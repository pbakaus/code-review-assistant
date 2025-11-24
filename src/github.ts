/**
 * GitHub Integration
 *
 * Handles PR data fetching (API) and actions (CLI)
 */

import { exec } from "node:child_process";
import { unlink, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { Octokit } from "@octokit/rest";
import type { PRData, PRFile } from "./types.js";

const execAsync = promisify(exec);

export class GitHubClient {
	private readonly octokit: Octokit;

	constructor(token: string) {
		if (!token || token === "your_github_token_here") {
			throw new Error(
				"GITHUB_TOKEN required. Get one at: https://github.com/settings/tokens",
			);
		}
		this.octokit = new Octokit({ auth: token });
	}

	async fetchPR(identifier: string): Promise<PRData> {
		const { owner, repo, number } = this.parsePRIdentifier(identifier);

		const [{ data: pr }, { data: files }] = await Promise.all([
			this.octokit.pulls.get({ owner, repo, pull_number: number }),
			this.octokit.pulls.listFiles({
				owner,
				repo,
				pull_number: number,
				per_page: 100,
			}),
		]);

		const diff = files
			.filter((f) => f.patch)
			.map((f) => `diff --git a/${f.filename} b/${f.filename}\n${f.patch}`)
			.join("\n\n");

		return {
			number,
			title: pr.title,
			body: pr.body ?? "",
			author: pr.user?.login ?? "unknown",
			url: pr.html_url,
			files: files.map((f) => ({
				filename: f.filename,
				status: f.status as PRFile["status"],
				additions: f.additions,
				deletions: f.deletions,
				changes: f.changes,
				patch: f.patch,
			})),
			diff,
		};
	}

	async assignReviewers(prNumber: number, reviewers: string[]): Promise<void> {
		await execAsync(
			`gh pr edit ${prNumber} --add-reviewer ${reviewers.join(",")}`,
		);
	}

	async postComment(prNumber: number, comment: string): Promise<void> {
		const tempFile = `.review-${prNumber}-${Date.now()}.md`;
		try {
			await writeFile(tempFile, comment, "utf-8");
			await execAsync(`gh pr comment ${prNumber} --body-file ${tempFile}`);
		} finally {
			await unlink(tempFile).catch(() => {}); // Ignore cleanup errors
		}
	}

	private parsePRIdentifier(identifier: string) {
		const patterns = [
			/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/,
			/^([^/]+)\/([^#]+)#(\d+)$/,
			/^([^/]+)\/([^/]+)\/pull\/(\d+)$/,
		];

		for (const pattern of patterns) {
			const match = identifier.match(pattern);
			if (match) {
				const [, owner, repo, numberStr] = match;
				if (!owner || !repo || !numberStr) continue;
				return { owner, repo, number: parseInt(numberStr, 10) };
			}
		}

		throw new Error(
			`Invalid PR identifier: ${identifier}\n` +
				"Supported: github.com/owner/repo/pull/123, owner/repo#123, owner/repo/pull/123",
		);
	}
}

export function formatPRForAgent(pr: PRData): string {
	const filesList = pr.files
		.map((f) => `  - ${f.filename} (+${f.additions}, -${f.deletions})`)
		.join("\n");

	return `
# Pull Request #${pr.number}: ${pr.title}

**Author:** @${pr.author}
**URL:** ${pr.url}

## Description

${pr.body || "(No description provided)"}

## Changed Files

${filesList}

## Full Diff

\`\`\`diff
${pr.diff}
\`\`\`
`.trim();
}

export function extractReviewers(review: string): string[] {
	const section = review.match(
		/## 👥 Recommended Reviewers([\s\S]*?)(?=##|$)/,
	)?.[1];
	if (!section) return [];

	const matches = [...section.matchAll(/@(\w+)/g)];
	return matches.map((m) => m[1]).filter((u): u is string => !!u);
}
