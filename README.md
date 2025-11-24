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
# Interactive mode (default) - prompts for actions after review
./agent facebook/react#28000
./agent owner/repo#123

# Non-interactive mode (for CI/CD)
./agent facebook/react#28000 --non-interactive
```

The agent will stream the review in real-time, then display the full review at the end.

**Interactive Mode** (default): After the review, you'll be prompted to:
- Auto-assign the recommended reviewers via `gh pr edit`
- Post the review as a PR comment via `gh pr comment`

**Non-Interactive Mode**: Just displays the review and exits (perfect for CI/CD pipelines).

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
- Offer to auto-assign reviewers via `gh pr edit`
- Offer to post the review as a comment via `gh pr comment`

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

**Agent behavior**: The agent's system prompt overrides the skill's post-review actions, so it will simply present the final review without offering to assign reviewers or post comments.

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

### Agent Mode (via ./agent)

When running the agent **interactively** (without `--non-interactive`), it will prompt you after the review:

1. **Auto-assign reviewers**: Assign the recommended reviewers using `gh pr edit`
2. **Post review as comment**: Post the full review as a PR comment using `gh pr comment`

Simply answer `y` or `N` to each prompt. The agent handles everything programmatically using GitHub CLI.

### Claude Code Mode

When using the skill directly in Claude Code, it will also offer these post-review actions interactively.

Use `--non-interactive` flag with the agent to skip prompts (ideal for CI/CD pipelines).

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
- [GitHub CLI](https://cli.github.com/) - Used for reviewer assignment and posting comments
- [GitHub Octokit](https://github.com/octokit/rest.js) - Used for fetching PR metadata

## License

Apache 2.0 - See LICENSE.txt