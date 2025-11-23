---
name: code-review-assistant
description: Analyze pull requests with intelligent reviewer assignment, code quality detection, and visual explanations. Use this skill when the user asks to review, analyze, or evaluate a PR, code changes, or pull request. Automatically identifies the right reviewers, flags potential issues against coding standards, and generates architectural diagrams for complex changes.
allowed-tools: [Bash, Read, Write, Grep, Glob, WebFetch]
---

# Code Review Assistant

Analyzes a pull request to assign reviewers, detect code issues, and visually explain complex changes. Can automatically assign reviewers via GitHub CLI and post review comments.

**Setup**: Run `bash scripts/setup.sh` to check environment and install dependencies.

## Getting PR Data

**If you have a diff and PR link provided:** Analyze that directly.

**Otherwise:** Use GitHub CLI to fetch from current repo:
```bash
gh pr view --json number,title,body,author,files
gh pr diff
```

If `gh` not installed: https://cli.github.com/

## Analysis Steps

1. **Assign Reviewers**: Read `reference/team-expertise.md`, match expertise areas to changes in the diff

2. **Detect Issues**: 
   - Read `reference/code-standards-map.md` for quick issue list
   - If any patterns match the diff, grep the full details from `code-standards.md` using the XML tag
   - Flag by severity (🔴🟡🔵)

3. **Visual Explanations**: If complex (webhooks, state flows, architecture), run:
   - `node scripts/generate-diagram.js "<description>"` 
   - `node scripts/upload-image.js <file>` → Cloudinary URL
   - Include as `![](url)` in review

### Output Format

```markdown
## 📋 PR Summary
[Title, author, files changed summary]

## 👥 Recommended Reviewers
- **@username** (Name) - Expertise areas that match this PR

## ⚠️ Areas of Concern
- 🔴/🟡/🔵 **Issue Title**
  - File and explanation
  - Recommended solution

## 🎨 Visual Explanations
![Diagram](url) - Description (only if complex logic warrants it)

## ✅ Overall Assessment
[Strengths, required changes, recommendation]
```

## Post-Review Actions

After presenting the review summary, ask the user if they want to:

1. **Auto-assign reviewers** (if PR number/URL is available):
   ```bash
   gh pr edit <number> --add-reviewer username1,username2,username3
   ```
   Use the GitHub usernames from the recommended reviewers list.
   Reference: https://cli.github.com/manual/gh_pr_edit

2. **Post review as PR comment** (if PR number/URL is available):
   ```bash
   gh pr comment <number> --body-file <review-file.md>
   ```
   Save the full review markdown to a temporary file first, then post it.

**Important**: Only offer these actions if you have the PR number or URL available. Ask for user confirmation before executing either command.

## Reference Files

Progressive disclosure - only load what you need:
- `reference/team-expertise.md` - Team member expertise areas with GitHub usernames
- `reference/code-standards-map.md` - Quick list of detectable issues (check this first)
- `reference/code-standards.md` - Full issue details with XML tags (grep specific sections)

## Scripts

- `scripts/generate-diagram.js` - Gemini API integration for visual explanations
- `scripts/upload-image.js` - Cloudinary upload for public image URLs

Run with Node.js, see script headers for usage details.
