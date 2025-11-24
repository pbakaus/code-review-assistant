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

