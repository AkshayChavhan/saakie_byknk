# Custom Claude Code Agents - Complete Guide

## Overview

This guide explains everything you need to know about creating, configuring, and using custom Claude Code agents for the Saree Shop e-commerce platform.

## What Are Custom Agents?

**Custom agents** are specialized AI assistants within Claude Code that have deep knowledge about your specific project. Think of them as expert team members with specialized skills.

### Key Points

- ✅ **On-Demand Only**: Agents run when you explicitly invoke them
- ✅ **Project-Aware**: They know your tech stack, patterns, and conventions
- ✅ **Tool-Enabled**: Have access to Read, Write, Edit, Bash, and other tools
- ✅ **Always Supervised**: You review and approve all changes
- ❌ **Not Autonomous**: They don't run in the background or monitor code

## Available Agents

### 1. UI Enhancement Agent (`saree-ui-enhancer`)
**Status**: ✅ Implemented
**Purpose**: Specialized in improving UI/UX of the saree-shop platform

**Expertise**:
- Next.js 15 App Router patterns
- React 19 components and hooks
- Tailwind CSS design system (red/gold palette)
- Radix UI primitives
- Mobile-first responsive design
- WCAG 2.1 AA accessibility
- Performance optimization

**Use When**:
- Improving component designs
- Adding animations and transitions
- Implementing loading states
- Enhancing mobile responsiveness
- Fixing accessibility issues
- Creating new UI components

### 2. API Integration Agent (`saree-api-integrator`)
**Status**: 🚧 Planned
**Purpose**: Manages frontend-backend communication

**Expertise**:
- Next.js API routes
- Express backend integration
- TanStack React Query patterns
- Clerk authentication (JWT)
- Error handling
- Type-safe API contracts

**Use When**:
- Creating new API endpoints
- Debugging API communication
- Implementing API hooks
- Handling authentication
- Optimizing API calls

### 3. Bug Resolution Agent (`saree-debugger`)
**Status**: 🚧 Planned
**Purpose**: Systematic debugging and issue resolution

**Expertise**:
- Next.js 15 debugging
- React 19 error boundaries
- TypeScript type errors
- Clerk authentication issues
- MongoDB/Prisma queries
- Vitest test failures

**Use When**:
- Encountering errors
- Debugging component issues
- Resolving type errors
- Investigating performance issues
- Fixing test failures

### 4. Code Review Agent (`saree-code-reviewer`)
**Status**: 🚧 Planned
**Purpose**: Proactive code quality improvements

**Expertise**:
- Next.js 15 best practices
- React 19 patterns
- TypeScript strict mode
- Security (OWASP top 10)
- Test coverage
- Performance optimization

**Use When**:
- Reviewing code before commits
- Identifying improvements
- Checking for best practices
- Security audits
- Performance reviews

## How to Use Agents

### Method 1: Direct Request (Recommended)

Simply ask Claude Code to use the agent in your conversation:

```
You: "Use the saree-ui-enhancer agent to improve the ProductCard hover effect"

Claude: *Invokes the UI Enhancement Agent*
Agent: *Analyzes ProductCard, implements improvements, returns results*
Claude: *Reports changes to you*
```

### Method 2: Automatic Invocation

Claude Code will automatically choose the right agent based on your request:

```
You: "The product cards need better mobile responsiveness"
Claude: *Automatically invokes saree-ui-enhancer*

You: "Getting a 401 error on cart API"
Claude: *Automatically invokes saree-debugger*

You: "Review my cart component changes"
Claude: *Automatically invokes saree-code-reviewer*
```

### Method 3: Via Task Tool (Advanced)

For programmatic usage or custom workflows:

```typescript
// This is what Claude Code does internally
Task({
  subagent_type: "saree-ui-enhancer",
  description: "Improve ProductCard hover",
  prompt: "Enhance the ProductCard component with smooth hover animations..."
})
```

## How Agents Work

### Technical Flow

```
1. YOU REQUEST
   ↓
2. CLAUDE CODE ANALYZES
   ↓
3. AGENT INVOKED
   ↓
4. AGENT LOADS CONFIG (.claude/agents/saree-ui-enhancer.md)
   ↓
5. AGENT USES TOOLS (Read, Write, Edit, Bash)
   ↓
6. AGENT RETURNS RESULTS
   ↓
7. CLAUDE CODE REPORTS TO YOU
   ↓
8. YOU REVIEW AND APPROVE
```

### What Agents Know

Each agent has deep context about your project:

- **Tech Stack**: Next.js 15, React 19, TypeScript 5.8.3, Tailwind CSS
- **Design System**: Red/gold color palette, custom animations
- **Patterns**: Mobile-first, component structure, naming conventions
- **Architecture**: App Router, Clerk auth, Prisma ORM, MongoDB
- **Quality Standards**: TypeScript strict, WCAG 2.1 AA, performance

## Creating New Agents

### Step 1: Create Agent Directory

Already done for this project:
```bash
.claude/
├── agents/
│   └── saree-ui-enhancer.md  # ✅ Implemented
└── agent-reports/
```

### Step 2: Create Agent Configuration File

Create a markdown file in `.claude/agents/[agent-name].md`:

```markdown
# Agent Name

## Agent Identity
Brief description of the agent's role and purpose.

## Project Context
- Tech stack details
- Design system specifications
- Architectural patterns
- Conventions and standards

## Your Responsibilities
List of primary tasks the agent handles.

## Coding Patterns to Follow
Specific code examples showing correct patterns.

## Tools Available
- Read, Write, Edit, Bash, Grep, Glob

## Success Criteria
How to measure if the agent did a good job.

## Example Tasks
Real-world scenarios with expected outputs.

## Important Guidelines
Rules the agent must follow.

## Response Format
How the agent should report results.
```

### Step 3: Test the Agent

```bash
# Start a conversation with Claude Code
You: "Use the [agent-name] agent to [specific task]"

# Verify the agent:
# 1. Loads the correct configuration
# 2. Understands the project context
# 3. Follows your patterns
# 4. Produces quality results
```

### Step 4: Refine Based on Results

After testing, update the configuration file:
- Add more specific patterns if agent deviates
- Include more examples for complex scenarios
- Add constraints for common mistakes
- Update project context as it evolves

## Real-World Examples

### Example 1: Improve Component Design

```
You: "The ProductCard component needs better hover effects"

Agent saree-ui-enhancer:
  ✓ Reads ProductCard.tsx
  ✓ Understands design system (primary-600, transitions)
  ✓ Implements smooth hover with scale and shadow
  ✓ Ensures keyboard focus states
  ✓ Tests TypeScript compilation
  ✓ Returns report with testing instructions

Result:
- Smooth image zoom on hover
- Border color transition
- Subtle shadow effect
- Proper focus states for accessibility
- All following design system conventions
```

### Example 2: Add Loading Skeleton

```
You: "Add loading skeleton to product grid"

Agent saree-ui-enhancer:
  ✓ Creates ProductCardSkeleton.tsx
  ✓ Matches ProductCard dimensions
  ✓ Uses design system colors (primary-200)
  ✓ Implements pulse animation
  ✓ Updates ProductGrid to show during loading
  ✓ Tests in browser at multiple screen sizes

Result:
- ProductCardSkeleton component created
- Matches design perfectly
- Shows during React Query loading
- Works on mobile, tablet, desktop
```

### Example 3: Debug API Error

```
You: "Getting 401 error when adding item to cart"

Agent saree-debugger: (when implemented)
  ✓ Reads cart API route
  ✓ Checks Clerk authentication flow
  ✓ Identifies missing token refresh
  ✓ Suggests fix with code example
  ✓ Explains root cause

Result:
- Issue identified: token expiration not handled
- Fix provided: implement token refresh logic
- Testing steps documented
```

## Best Practices

### ✅ DO

- **Start with one agent** - UI Enhancer is already set up
- **Test thoroughly** - Always verify agent changes in browser
- **Review all changes** - Don't commit without reviewing
- **Provide clear instructions** - Be specific about what you want
- **Update configs** - Keep agent knowledge current as project evolves
- **Use version control** - Commit agents to git for team consistency
- **Share with team** - Let everyone benefit from specialized agents

### ❌ DON'T

- **Trust blindly** - Always review agent output
- **Skip testing** - Test on multiple screen sizes
- **Create all at once** - Master one agent before adding more
- **Forget to update** - Keep configs in sync with project
- **Let agents commit** - You control all commits
- **Use for sensitive ops** - Always supervise critical changes
- **Expect perfection** - Agents learn through iteration

## Troubleshooting

### Problem: Agent Not Found

```bash
Error: "Agent 'saree-ui-enhancer' not found"

Solutions:
1. Check file exists: .claude/agents/saree-ui-enhancer.md
2. Verify filename matches exactly (case-sensitive)
3. Ensure file is properly formatted markdown
4. Try restarting Claude Code
```

### Problem: Agent Makes Wrong Changes

```bash
Problem: Agent not following your patterns

Solutions:
1. Review agent configuration file
2. Add more specific examples
3. Add "Patterns to NEVER Use" section
4. Provide more project context
5. Show examples of correct vs incorrect patterns
```

### Problem: Agent Too Slow

```bash
Problem: Agent takes too long to respond

Solutions:
1. Be more specific in your request
2. Break large tasks into smaller ones
3. Reduce configuration file size (focus on essentials)
4. Use simpler example code in config

Example:
Instead of: "Improve all product components"
Try: "Improve ProductCard hover effect"
```

### Problem: TypeScript Errors After Changes

```bash
Problem: Agent changes break TypeScript

Solutions:
1. Add TypeScript rules to agent config:
   ## Success Criteria
   - All changes must pass: npx tsc --noEmit
   - Strict mode compliance required

2. Include type examples in config
3. Reference existing well-typed components
4. Add pre-return validation step

Prevention:
Add to agent config:
## Before Returning
1. Run: npx tsc --noEmit
2. Fix any type errors
3. Only return if compilation succeeds
```

## Measuring Agent Effectiveness

Track these metrics to improve your agents:

### Quality Metrics
- **Acceptance Rate**: % of agent suggestions you use (target: >80%)
- **Revision Count**: Number of changes needed (target: <2)
- **Error Rate**: TypeScript/lint errors after changes (target: 0)
- **Test Pass Rate**: Tests passing after changes (target: 100%)

### Efficiency Metrics
- **Time Savings**: Time saved vs manual implementation
- **Messages**: Back-and-forth required (target: <3)
- **Consistency**: Following patterns without reminders

### Improvement Actions

```
If acceptance rate < 70%:
  → Add more specific examples to config
  → Clarify constraints and patterns
  → Include more project context

If revisions > 2 per task:
  → Add common edge cases to config
  → Improve example quality
  → Add "What NOT to do" section

If TypeScript errors frequent:
  → Add type examples
  → Reference well-typed components
  → Add compilation check step
```

## GitHub Actions Integration (Future)

Once agents are tested and refined locally, you can integrate them into your CI/CD pipeline:

```yaml
# .github/workflows/claude-agents.yml
name: Claude Code Agents

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  ui-review:
    name: UI Enhancement Review
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.changed_files, 'components/')
    steps:
      - uses: actions/checkout@v4
      - name: Run UI Enhancement Agent
        run: npx claude-code agent run saree-ui-enhancer
      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const findings = require('./agent-reports/ui-enhancement.json');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              body: findings.summary
            });
```

## Advanced Topics

### Multi-Agent Collaboration

Agents can work together on complex tasks:

```
You: "Add real-time cart synchronization"

Flow:
1. saree-api-integrator → Creates WebSocket endpoint
2. saree-ui-enhancer → Updates cart component UI
3. saree-code-reviewer → Validates implementation
4. saree-debugger → Tests error scenarios

Claude Code orchestrates the collaboration.
```

### Agent Communication Pattern

```typescript
// Agent A completes its work
{
  summary: "Created WebSocket API",
  files: ["app/api/cart/ws/route.ts"],
  nextSteps: "Frontend needs to implement WebSocket client"
}

// Claude Code invokes Agent B with context
{
  previousWork: Agent A's output,
  task: "Implement WebSocket client in cart component"
}
```

## FAQ

**Q: Will agents work without me being present?**
A: NO. Agents only run when you explicitly invoke them or Claude Code invokes them during your active session.

**Q: Can agents break my code?**
A: Agents can make mistakes, but you always review changes before committing. Use git version control to revert if needed.

**Q: How do agents know my project?**
A: Through configuration files you create in `.claude/agents/`. The better your configuration, the better the agent performs.

**Q: Can multiple agents work together?**
A: YES! Claude Code can orchestrate multiple agents for complex tasks.

**Q: Do I need to pay extra?**
A: No additional cost beyond Claude Code subscription. No per-agent fees.

**Q: Can agents access my database?**
A: Only through code. They can read/write code files and run bash commands, but have no direct database access.

**Q: How long to create an agent?**
A: Simple agent: 30-60 minutes. Comprehensive agent: 2-4 hours. Testing: 1-2 hours.

**Q: Can I share agents with my team?**
A: YES! Commit `.claude/agents/` to git so everyone benefits.

## Project Structure

```
saree-shop/
├── .claude/
│   ├── agents/
│   │   ├── saree-ui-enhancer.md         # ✅ UI Enhancement Agent
│   │   ├── saree-api-integrator.md      # 🚧 Planned
│   │   ├── saree-debugger.md            # 🚧 Planned
│   │   └── saree-code-reviewer.md       # 🚧 Planned
│   ├── agent-reports/                   # Agent output logs
│   ├── settings.local.json              # Claude Code settings
│   └── AGENTS_README.md                 # This file
├── components/                          # React components
├── app/                                 # Next.js App Router
└── ...
```

## Next Steps

### Immediate Actions

1. **Test UI Enhancement Agent**:
   ```
   You: "Use the saree-ui-enhancer agent to improve the ProductCard component"
   ```

2. **Verify Results**:
   ```bash
   npm run dev
   # Test in browser at different screen sizes
   ```

3. **Refine Configuration**:
   - Based on results, update `.claude/agents/saree-ui-enhancer.md`
   - Add more examples if needed
   - Clarify any confusing patterns

### Short-term (Next 2-3 Weeks)

1. **Create API Integration Agent**:
   - Copy structure from UI Enhancement Agent
   - Customize for API-specific patterns
   - Test with real API endpoint creation

2. **Create Bug Resolution Agent**:
   - Focus on common error patterns
   - Include debugging strategies
   - Test with existing known issues

3. **Create Code Review Agent**:
   - Define quality criteria
   - Include security best practices
   - Test with recent commits

### Long-term (Month 2+)

1. **GitHub Actions Integration**:
   - Set up workflow file
   - Configure agent triggers
   - Test on feature branch

2. **Team Training**:
   - Document usage patterns
   - Create example workflows
   - Share best practices

3. **Continuous Improvement**:
   - Track effectiveness metrics
   - Update configs based on usage
   - Add new agents as needs arise

## Support and Resources

- **Project Documentation**: See `ARCHITECTURE.md` for saree-shop details
- **Claude Code Documentation**: https://docs.anthropic.com/claude-code
- **Agent Configuration**: `.claude/agents/saree-ui-enhancer.md` (reference example)
- **Plan File**: `/home/l910009/.claude/plans/magical-percolating-biscuit.md` (detailed implementation plan)

## Conclusion

Custom agents transform your development workflow by providing:

- **Specialized expertise** for common tasks
- **Consistent code quality** following your exact standards
- **Faster development** through pattern recognition
- **Better code reviews** with automated checks
- **Team alignment** on coding standards

Remember: Agents are **assistants, not replacements**. Always review their work, iterate on configurations, and share learnings with your team.

**Start small, test thoroughly, and scale gradually!**

---

**Created**: 2026-02-03
**Project**: Saree Shop E-commerce Platform
**Status**: UI Enhancement Agent Implemented ✅
