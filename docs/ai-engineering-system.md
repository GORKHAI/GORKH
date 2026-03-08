# AI Engineering System (Iteration 30)

A spec-driven development system integrated into AI Operator that provides structured workflows for building features with AI assistance.

## Overview

The AI Engineering System implements a **5-phase workflow** for systematic development:

```
Research → Specify → Plan → Work → Review
```

Each phase uses specialized agents to ensure quality and completeness.

## Quick Start

1. Open AI Operator Desktop
2. Click **"🚀 AI Engineer"** button in the header
3. Enter a feature description (e.g., "Add user authentication")
4. Select relevant agents (or use defaults)
5. Click **"Run Full Workflow"**

## 5-Phase Workflow

### Phase 1: Research 🔍

**Purpose:** Analyze codebase and gather context

**What happens:**
- Scans existing code for patterns
- Identifies integration points
- Reviews related documentation
- Finds potential gaps

**Output:** Research report with findings and recommendations

### Phase 2: Specify 📋

**Purpose:** Create detailed feature specification

**Uses TCRO Framework:**
- **T**est Cases: Given/When/Then scenarios
- **C**onstraints: Technical, business, legal limitations
- **R**esources: APIs, databases, services needed
- **O**bjectives: Measurable success criteria

**Output:** Feature specification document

### Phase 3: Plan 📐

**Purpose:** Design implementation approach

**Creates:**
- Task breakdown with estimates
- Dependency mapping
- Risk assessment
- Timeline with buffer

**Output:** Implementation plan with actionable tasks

### Phase 4: Work ⚒️

**Purpose:** Execute the implementation

**Agents execute:**
- Code generation
- Test writing
- Integration
- Documentation

**Output:** Implemented feature with tests

### Phase 5: Review ✓

**Purpose:** Multi-perspective code review

**Reviewers check:**
- Code quality
- Security
- Performance
- Maintainability
- Test coverage

**Output:** Review report with approvals or change requests

## Ralph Wiggum Mode 🔄

Enable **Ralph Wiggum Mode** for persistent iteration:

> "Iteration > Perfection, Failures Are Data, Persistence Wins"

When enabled, each phase continues iterating until quality gates are met or max iterations reached. Perfect for complex features requiring refinement.

**Use cases:**
- Complex architectural decisions
- Security-critical code
- Performance-sensitive implementations
- Learning new patterns

## Specialized Agents

### Architecture & Planning
- **Architect Advisor** - High-level guidance and technology recommendations
- **Backend Architect** - API and data model design
- **Infrastructure Builder** - DevOps and deployment architecture

### Development
- **Full Stack Developer** - Cross-stack implementation
- **API Builder** - REST/GraphQL API design
- **Frontend Reviewer** - UI/UX code review
- **Database Optimizer** - Schema and query optimization

### Quality & Testing
- **Code Reviewer** - General code quality
- **Test Generator** - Comprehensive test suites
- **Security Scanner** - Vulnerability detection
- **Performance Engineer** - Speed and efficiency

### DevOps
- **Deployment Engineer** - CI/CD and release
- **Monitoring Expert** - Observability setup

## Usage Examples

### Basic Feature
```
Description: "Add a search bar to the dashboard"
Agents: Full Stack Developer, Test Generator
Mode: Standard
```

### Complex Feature with Ralph
```
Description: "Implement real-time collaboration with CRDTs"
Agents: Architect Advisor, Backend Architect, Full Stack Developer
Mode: Ralph Wiggum (5 iterations max)
```

### Security Review
```
Description: "Review authentication system"
Agents: Security Scanner, Code Reviewer
Phase: Run only Review phase
```

## File Outputs

The system generates artifacts in your workspace:

```
workspace/
├── specs/
│   └── spec-{timestamp}.md       # Feature specification
├── plans/
│   └── plan-{timestamp}.md       # Implementation plan
└── src/
    └── feature/                   # Generated implementation
        ├── index.ts
        ├── types.ts
        └── feature.test.ts
```

## Integration with AI Assist

The AI Engineering System complements the existing AI Assist mode:

- **AI Assist**: Real-time desktop automation with local LLM
- **AI Engineering System**: Structured development workflow

Use AI Assist for quick tasks, AI Engineering System for building features.

## Tips

1. **Start simple** - Use default agents for your first workflow
2. **Be specific** - Clear feature descriptions yield better results
3. **Review outputs** - Always review generated specs before proceeding
4. **Iterate** - Use Ralph mode when quality is critical
5. **Customize** - Select specific agents based on your needs

## Technical Details

The system is implemented in `/packages/shared/src/agent/`:

- `types.ts` - Core type definitions
- `agents.ts` - Agent definitions and groupings
- `workflow.ts` - 5-phase workflow engine

UI components are in `/apps/desktop/src/components/AgentWorkflow.tsx`.

## Comparison

| Feature | AI Assist | AI Engineering System |
|---------|-----------|----------------------|
| Use case | Desktop automation | Feature development |
| Input | Screenshots + goals | Feature descriptions |
| Output | Actions | Code + specs |
| Workflow | Single-step proposals | 5-phase structured |
| Agents | Single (local LLM) | 16 specialized |
| Ralph mode | No | Yes |

## Future Enhancements

Planned improvements:
- External research sources (documentation, GitHub)
- Custom agent definitions
- Workflow templates
- Integration with CI/CD
- Team collaboration features

## Feedback

The AI Engineering System is an experimental feature. Share feedback and suggestions for improvement.
