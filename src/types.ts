/**
 * Type definitions for the review agent
 */

export interface PRData {
	number: number;
	title: string;
	body: string;
	author: string;
	url: string;
	files: PRFile[];
	diff: string;
}

export interface PRFile {
	filename: string;
	status: "added" | "modified" | "removed" | "renamed";
	additions: number;
	deletions: number;
	changes: number;
	patch?: string;
}

export interface CLIOptions {
	pr: string;
	postComment: boolean;
	help: boolean;
}

export interface ReviewResult {
	summary: string;
	reviewers: string[];
	concerns: string[];
	visualExplanations: string[];
	assessment: string;
}

// Agent SDK message types
export interface AgentMessage {
	type: string;
	text?: string;
	name?: string;
	error?: string;
}

