# Code Review Assistant Skill

An intelligent code review skill for Claude that provides automated reviewer assignment, concern detection, and visual explanations for pull requests.

## Features

- **🎯 Smart Reviewer Assignment**: Automatically suggests reviewers based on code changes and team expertise
- **⚠️ Concern Detection**: Identifies potential issues against company coding standards
- **🎨 Visual Explanations**: Generates diagrams for complex code changes using AI
- **🔄 Dual-Mode Operation**: Works standalone in Claude Code or via Agent SDK

## Quick Start

### Option 1: Use in Claude Code

1. Copy the skill to your project:
   ```bash
   cp -r code-review-assistant .claude/skills/
   ```

2. Open your repo in Claude Code

3. Ask Claude to review a PR:
   ```
   Review the current PR using code-review-assistant
   ```

Claude will:
- Fetch the PR using GitHub CLI
- Analyze changes
- Generate a review
- Post it as a PR comment

### Option 2: Use via Agent SDK

See the [review-agent](../review-agent/README.md) for programmatic usage via TypeScript Agent SDK.

## Customization

### 1. Update Team Expertise

Edit `reference/team-expertise.md` with your actual team members:

```markdown
## Your Name - Your Specialty
**Primary Expertise:**
- List your skills

**File Patterns:**
- `path/to/your/files/**/*`

**Keywords to Match:**
- keywords, from, your, domain
```

### 2. Update Coding Standards

Edit `reference/code-standards.md` with your company's standards:

```markdown
### 🔴 Critical: Your Custom Rule
**Pattern**: What to detect
**Why It's a Problem**: Explanation
**Recommended Solution**: How to fix
```

### 3. Configure API Keys

For diagram generation and image uploads, set environment variables:

```bash
export GEMINI_API_KEY="your-gemini-api-key"
export IMGUR_CLIENT_ID="your-imgur-client-id"
```

## Usage Examples

### Example 1: Simple Review

```
User: Review PR #123

Skill:
- Fetches PR data
- Assigns reviewers
- Checks for common issues
- Posts review
```

### Example 2: Complex Changes with Diagram

```
User: Analyze the webhook implementation in this PR

Skill:
- Detects complex event flow
- Generates architecture diagram
- Uploads to Imgur
- Includes diagram in review
```

### Example 3: Security Audit

```
User: Check this PR for security issues

Skill:
- Scans for hardcoded secrets
- Checks for SQL injection risks
- Verifies auth patterns
- Flags critical concerns
```

## How It Works

### 1. PR Data Acquisition
- **Standalone**: Uses `gh pr view` and `gh pr diff` commands
- **Agent Mode**: Receives structured data from agent

### 2. Pattern Matching
- Matches changed files to team expertise
- Scans diff for known anti-patterns
- Assigns severity levels

### 3. Visual Generation
- Identifies complex changes needing diagrams
- Uses Gemini API to generate whiteboard sketches
- Uploads to Imgur for public URLs

### 4. Review Posting
- Formats review as markdown
- Posts via `gh pr comment` (standalone)
- Returns to agent (SDK mode)

## File Structure

```
code-review-assistant/
├── SKILL.md                     # Main skill definition
├── LICENSE.txt                  # Apache 2.0 license
├── README.md                    # This file
├── reference/
│   ├── team-expertise.md        # Team member expertise mapping
│   ├── code-standards.md        # Coding standards & concerns
│   └── examples.md              # Example reviews
└── scripts/
    ├── generate-diagram.js      # Gemini API integration
    └── upload-image.js          # Imgur upload script
```

## Prerequisites

### Standalone Mode
- GitHub CLI installed: `gh --version`
- Authenticated: `gh auth login`
- Node.js 18+ for scripts

### Agent SDK Mode
- See [review-agent README](../review-agent/README.md)

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Optional | For diagram generation |
| `IMGUR_CLIENT_ID` | Optional | For image hosting |

Get API keys:
- Gemini: https://makersuite.google.com/app/apikey
- Imgur: https://api.imgur.com/oauth2/addclient

## Troubleshooting

### "gh: command not found"
Install GitHub CLI: https://cli.github.com/

### "no pull requests found"
Ensure you're in a repo with an active PR:
```bash
gh pr list
```

### "Could not generate diagram"
Check `GEMINI_API_KEY` is set and valid.

### "Image upload failed"
Check `IMGUR_CLIENT_ID` is set. Imgur may have rate limits.

## Customization Guide

### Adding New Concern Types

1. Edit `reference/code-standards.md`
2. Add new section with pattern, issue, and solution
3. Test with sample code

### Adding New Team Members

1. Edit `reference/team-expertise.md`
2. Add member with file patterns and keywords
3. Test reviewer assignment

### Modifying Output Format

The output format is defined in `SKILL.md`. You can customize:
- Section order
- Severity emoji (🔴🟡🔵)
- Markdown structure
- Explanation depth

## Advanced Usage

### Integrating with CI/CD

You can trigger reviews automatically:

```yaml
# .github/workflows/review.yml
name: Auto Review
on: pull_request

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Review PR
        run: |
          # Use Agent SDK to review
          cd review-agent
          npm install
          npm start -- --pr "${{ github.repository }}#${{ github.event.pull_request.number }}" --post-comment
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Custom Diagrams

You can extend `scripts/generate-diagram.js` to use different visualization tools:
- Mermaid for flow diagrams
- Excalidraw for whiteboard style
- D3.js for data visualizations

## Contributing

This skill is part of a demo project. To customize:

1. Fork the skill directory
2. Update reference files
3. Test thoroughly
4. Share improvements!

## License

Apache 2.0 - See LICENSE.txt

## Support

For issues or questions about:
- **The skill itself**: Customize as needed for your team
- **Agent SDK**: https://docs.anthropic.com/claude/docs
- **GitHub CLI**: https://cli.github.com/manual

## Version History

- v1.0 - Initial release with dual-mode support, reviewer assignment, concern detection, and visual explanations

