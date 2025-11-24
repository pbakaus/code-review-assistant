# Code Review Assistant Demo

A demonstration of Anthropic's Claude Agent SDK and Skills, showcasing intelligent automated code review with reviewer assignment, concern detection, and AI-generated visual explanations.

## What Makes This Demo Special

**Portable Skill**: The code-review-assistant skill works everywhere:
- Drop in any repo for standalone use in Claude Code
- Use programmatically via Agent SDK
- Integrate into CI/CD pipelines

**Intelligent Analysis**: Contextual understanding, not just pattern matching:
- Smart reviewer assignment based on code changes
- Detection of subtle issues (race conditions, security risks)
- Visual explanations for complex logic

## Quick Start

### 1. Install & Configure

```bash
npm install

# Copy and edit .env with your API keys
cp .env.example .env
```

Required API keys:
- **Anthropic**: https://console.anthropic.com/
- **GitHub**: https://github.com/settings/tokens (needs `repo` scope)
- **Gemini** (optional): https://makersuite.google.com/app/apikey
- **Cloudinary** (optional): https://cloudinary.com/console/settings/api

### 2. Run

```bash
# Review a PR (simple!)
./agent facebook/react#28000
./agent owner/repo#123
./agent https://github.com/owner/repo/pull/123
```

The agent will stream the review in real-time, then display the full review at the end.

## Project Structure

```
.
├── .claude/skills/code-review-assistant/   # The reusable skill
│   ├── SKILL.md                            # Main skill definition
│   ├── reference/                          # Knowledge base
│   │   ├── team-expertise.md               # Team member expertise
│   │   ├── code-standards-map.md           # Quick issue reference
│   │   └── code-standards.md               # Detailed standards
│   ├── scripts/                            # Utility scripts
│   │   ├── generate-diagram.js             # AI diagram generation (Gemini)
│   │   ├── upload-image.js                 # Image hosting (Cloudinary)
│   │   ├── setup.sh                        # Setup helper
│   │   └── package.json                    # Script dependencies
│   └── diagrams/                           # Generated diagrams
│
├── src/                                    # Agent SDK implementation
│   ├── index.ts                            # Main CLI agent
│   ├── github.ts                           # GitHub integration
│   └── types.ts                            # Type definitions
│
├── package.json                            # Project dependencies
├── tsconfig.json                           # TypeScript config
└── .env                                    # API keys (create from .env.example)
```

## Two Ways to Use

### Mode 1: Standalone in Claude Code

Perfect for ad-hoc reviews during development:

1. Copy skill to your project:
   ```bash
   cp -r .claude/skills/code-review-assistant /your/repo/.claude/skills/
   ```

2. In Claude Code, ask:
   ```
   Review the current PR using code-review-assistant
   ```

Claude will automatically:
- Fetch PR using GitHub CLI
- Analyze changes against your team's standards
- Generate diagrams for complex logic
- In Claude Code: Offer to auto-assign reviewers and post comments
- In Agent SDK: Simply present the review (no interactive prompts yet)

### Mode 2: Programmatic with Agent SDK

Perfect for automation and CI/CD. The agent automatically loads skills from the filesystem using `settingSources`:

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

for await (const message of query({
  prompt: `Review this PR: ${prData}`,
  options: {
    settingSources: ["user", "project"], // Load skills from filesystem
    allowedTools: ["Skill", "Bash", "Read", "Write", "Grep", "Glob", "WebFetch"],
    model: 'claude-sonnet-4-20250514'
  }
})) {
  console.log(message);
}
```

**Note**: The `allowed-tools` field in SKILL.md frontmatter is ignored by the SDK - you must specify `allowedTools` in the SDK configuration instead. See the [official skills documentation](https://platform.claude.com/docs/en/agent-sdk/skills) for details.

## Customization

### For Your Team

1. **Update team expertise**: Edit `.claude/skills/code-review-assistant/reference/team-expertise.md`
   - Add your team members with their GitHub usernames (e.g., `@username`)
   - List their areas of expertise
2. **Add your standards**: Edit `code-standards.md` and `code-standards-map.md`
3. **Customize output**: Modify the "Output Format" section in `SKILL.md`

### For Your Tech Stack

The skill adapts to different technologies:
- **Vue/Angular**: Update pattern matching in code-standards.md
- **Python/Django**: Add Python-specific concerns
- **Go/Rust**: Adjust file patterns and detection logic

## Interactive Features

The skill offers interactive post-review actions powered by [GitHub CLI](https://cli.github.com/manual/gh_pr_edit):

### Auto-Assign Reviewers

**In Claude Code**: After the review, the skill will ask if you want to automatically assign the recommended reviewers:

```bash
gh pr edit <number> --add-reviewer username1,username2,username3
```

This uses the GitHub usernames from your `team-expertise.md` file.

### Post Review as Comment

**In Claude Code**: The skill can also post the full review as a PR comment:

```bash
gh pr comment <number> --body-file review.md
```

**Note**: The Agent SDK mode doesn't support interactive prompts yet, so it will only display the review without offering these actions.

## Development

```bash
# Run the agent
./agent "owner/repo#123"

# Run in dev mode (with watch)
npm run dev

# Build TypeScript
npm run build
```

## CI/CD Integration Example

**Note**: For CI/CD, the agent will automatically run without interactive prompts:

```yaml
name: Auto Review
on: pull_request

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: ./agent "${{ github.repository }}#${{ github.event.pull_request.number }}"
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Troubleshooting

**"ANTHROPIC_API_KEY is not set"**: Create `.env` file with your API key

**"PR not found"**: Check repository access and PR number

**"Module not found"**: Run `npm install`

**Diagram generation fails**: Ensure `GEMINI_API_KEY` is set and run `bash .claude/skills/code-review-assistant/scripts/setup.sh`

## Resources

- [Agent SDK Documentation](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [Agent Skills Guide](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Skills Engineering Blog](https://anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [GitHub Octokit](https://github.com/octokit/rest.js)

## License

Apache 2.0 - See LICENSE.txt