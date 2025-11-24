# Code Review Assistant

This is a code review assistant skill and bundled CLI agent. Rather than reviewing the code entirely on its own, it's serving as an intelligent companion to a reviewer, by providing the following:

1. Automatic matching of reviewers on your team based on their expertise
2. First code review pass based on team-specific code patterns and concerns
3. Visual explanation of complex architectural changes (feat. Nano Banana Pro)

## Sample output

For a representative example, take a look at this PR comment: https://github.com/pbakaus/code-review-assistant/pull/1#issuecomment-3568698430

## How to Use

### Setup

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

### Option 1: CLI Agent (Automation & CI/CD)

Use the bundled agent for automated reviews on any PR:

```bash
# Interactive mode (default) - prompts for actions after review
./agent facebook/react#28000

# Non-interactive mode (for CI/CD)
./agent facebook/react#28000 --non-interactive

# Force diagram generation for all PRs
./agent facebook/react#28000 --force-diagrams
```

**CLI Options:**
- `--non-interactive`: Skip prompts (for CI/CD pipelines)
- `--force-diagrams`: Always generate visual diagrams, even for simple PRs

**Interactive Mode** (default): After the review, you'll be prompted to:
- Auto-assign the recommended reviewers via `gh pr edit`
- Post the review as a PR comment via `gh pr comment`

**Non-Interactive Mode**: Just displays the review and exits (perfect for CI/CD pipelines).

### Option 2: Claude Code (Ad-Hoc Reviews)

Use the skill directly in Claude Code for quick reviews during development:

1. Copy skill to your project:
   ```bash
   cp -r .claude/skills/code-review-assistant /your/repo/.claude/skills/
   ```

2. In Claude Code, ask:
   ```
   Review the current PR
   ```

Claude will automatically:
- Fetch PR using GitHub CLI
- Analyze changes against your team's standards
- Generate diagrams for complex logic
- Offer to auto-assign reviewers via `gh pr edit`
- Offer to post the review as a comment via `gh pr comment`

### Option 3: Agent SDK (Programmatic)

Use the skill programmatically in your own code:

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

for await (const message of query({
  prompt: `Review this PR: ${prData}`,
  options: {
    settingSources: ["user", "project"], // Load skills from filesystem
    allowedTools: ["Skill", "Bash", "Read", "Write", "Grep", "Glob", "WebFetch"],
  }
})) {
  console.log(message);
}
```

## Customization

1. **Update team expertise**: Edit `.claude/skills/code-review-assistant/reference/team-expertise.md`
   - Add your team members with their GitHub usernames (e.g., `@username`)
   - List their areas of expertise
2. **Add your standards**: Edit `code-standards.md` and `code-standards-map.md`
3. **Customize output**: Modify the "Output Format" section in `SKILL.md`

## Resources

- [Introducing Agent Skills](https://www.claude.com/blog/skills)
- [Agent Skills in Claude Code](https://code.claude.com/docs/en/skills)
- [Anthropic sample skills](https://github.com/anthropics/skills)
- [Agent SDK Documentation](https://platform.claude.com/docs/en/agent-sdk/typescript)
- [Agent Skills Guide](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Skills Engineering Blog](https://anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [GitHub CLI](https://cli.github.com/) - Used for reviewer assignment and posting comments
- [GitHub Octokit](https://github.com/octokit/rest.js) - Used for fetching PR metadata

## License

Apache 2.0 - See LICENSE.txt
