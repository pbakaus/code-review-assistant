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
# Review a public PR
npm start -- --pr "facebook/react#28000"

# Review and post comment (use with caution!)
npm start -- --pr "owner/repo#123" --post-comment
```

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
- Post review comment to GitHub

### Mode 2: Programmatic with Agent SDK

Perfect for automation and CI/CD:

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

for await (const message of query({
  prompt: `Review this PR: ${prData}`,
  options: {
    plugins: [{ 
      type: 'local', 
      path: './.claude/skills/code-review-assistant' 
    }],
    model: 'claude-sonnet-4-20250514'
  }
})) {
  console.log(message);
}
```

## Features Demonstrated

### Agent SDK
- ✅ Loading custom skills from local filesystem
- ✅ Streaming responses for real-time output
- ✅ Environment isolation with `settingSources`
- ✅ Type-safe TypeScript implementation

### Skills
- ✅ Dual-mode operation (standalone + SDK)
- ✅ Progressive disclosure (loads only what's needed)
- ✅ Dynamic tool usage (GitHub CLI, Node scripts)
- ✅ External API integration (Gemini, Cloudinary)

### Real-World Integration
- ✅ GitHub API (Octokit) for PR data
- ✅ GitHub CLI for standalone mode
- ✅ Gemini API for diagram generation
- ✅ Cloudinary for image hosting

## Customization

### For Your Team

1. **Update team expertise**: Edit `.claude/skills/code-review-assistant/reference/team-expertise.md`
2. **Add your standards**: Edit `code-standards.md` and `code-standards-map.md`
3. **Customize output**: Modify the "Output Format" section in `SKILL.md`

### For Your Tech Stack

The skill adapts to different technologies:
- **Vue/Angular**: Update pattern matching in code-standards.md
- **Python/Django**: Add Python-specific concerns
- **Go/Rust**: Adjust file patterns and detection logic

## Development

```bash
# Run in dev mode (with watch)
npm run dev -- --pr "owner/repo#123"

# Build
npm run build

# Run tests
npm start -- --pr "facebook/react#28000"
```

## CI/CD Integration Example

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
      - run: npm start -- --pr "${{ github.repository }}#${{ github.event.pull_request.number }}" --post-comment
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Demo Script (5-Minute Video)

### Act 1: The Problem (30s)
"Code reviews are time-consuming. Assigning reviewers, catching mistakes, explaining complex changes—it all adds up."

### Act 2: The Skill (90s)
Show the skill structure: SKILL.md, reference files, scripts. Explain progressive disclosure and dual-mode operation.

### Act 3: Live Demo (120s)
Run the agent on a real PR:
- Watch reviewer assignment with reasoning
- See it flag a useEffect anti-pattern
- Show generated diagram for webhook flow
- Review posted to GitHub

### Act 4: The Value (30s)
"Skills are portable. Same code, many contexts. Agent SDK gives programmatic control. Real productivity gains. Easy to customize."

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

## Acknowledgments

Created for the Claude Developer Platform demo challenge, demonstrating:
- Anthropic's Claude Agent SDK
- Agent Skills architecture
- Real-world AI agent patterns

