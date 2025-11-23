---
name: code-review-assistant
description: Comprehensive PR analysis with reviewer assignment, concern detection, and visual explanation generation. Automatically assigns reviewers based on expertise, flags potential issues against company standards, and generates visual explanations for complex code.
allowed-tools: [Bash, Read, Write, Grep, Glob, WebFetch]
---

# Code Review Assistant

Analyzes a pull request to assign reviewers, detect code issues, and visually explain complex changes.

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
- **Name** (Expertise) - Why they should review

## ⚠️ Areas of Concern
- 🔴/🟡/🔵 **Issue Title**
  - File and explanation
  - Recommended solution

## 🎨 Visual Explanations
![Diagram](url) - Description (only if complex logic warrants it)

## ✅ Overall Assessment
[Strengths, required changes, recommendation]
```

## Reference Files

Progressive disclosure - only load what you need:
- `reference/team-expertise.md` - Team member expertise areas
- `reference/code-standards-map.md` - Quick list of detectable issues (check this first)
- `reference/code-standards.md` - Full issue details with XML tags (grep specific sections)
- `reference/examples.md` - Example reviews and patterns

## Scripts

- `scripts/generate-diagram.js` - Gemini API integration for visual explanations
- `scripts/upload-image.js` - Cloudinary upload for public image URLs

Run with Node.js, see script headers for usage details.
