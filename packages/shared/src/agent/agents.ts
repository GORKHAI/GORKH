/**
 * AI Engineering System - Agent Registry
 * Definitions for all specialized agents
 */

import { Agent, AgentRole, WorkflowPhase } from './types.js';

export const AGENTS: Record<AgentRole, Agent> = {
  // ============================================================================
  // Architecture & Planning
  // ============================================================================
  
  [AgentRole.ARCHITECT_ADVISOR]: {
    id: AgentRole.ARCHITECT_ADVISOR,
    name: 'Architect Advisor',
    description: 'Provides high-level architectural guidance and technology recommendations',
    expertise: ['system-design', 'technology-selection', 'scalability', 'patterns'],
    phase: WorkflowPhase.RESEARCH,
    promptTemplate: `You are an experienced software architect.
Analyze the following context and provide architectural recommendations.
Focus on: scalability, maintainability, and technology fit.

Context: {{input}}

Provide:
1. Recommended architecture approach
2. Technology stack suggestions
3. Key design patterns to apply
4. Potential pitfalls to avoid`,
    tools: ['code-search', 'dependency-analysis', 'tech-radar'],
  },
  
  [AgentRole.BACKEND_ARCHITECT]: {
    id: AgentRole.BACKEND_ARCHITECT,
    name: 'Backend Architect',
    description: 'Designs backend services, APIs, and data models',
    expertise: ['api-design', 'database-schema', 'microservices', 'performance'],
    phase: WorkflowPhase.PLAN,
    promptTemplate: `You are a backend architecture specialist.
Design the backend for: {{input}}

Include:
1. API endpoints with method signatures
2. Data models and relationships
3. Service boundaries
4. Error handling strategy`,
    tools: ['api-designer', 'schema-generator'],
  },
  
  [AgentRole.INFRASTRUCTURE_BUILDER]: {
    id: AgentRole.INFRASTRUCTURE_BUILDER,
    name: 'Infrastructure Builder',
    description: 'Designs deployment infrastructure and DevOps pipelines',
    expertise: ['docker', 'kubernetes', 'ci-cd', 'cloud-providers', 'terraform'],
    phase: WorkflowPhase.PLAN,
    promptTemplate: `You are a DevOps and infrastructure expert.
Design the infrastructure for: {{input}}

Include:
1. Deployment architecture
2. CI/CD pipeline stages
3. Monitoring and alerting
4. Security considerations`,
    tools: ['infra-generator', 'cost-estimator'],
  },
  
  // ============================================================================
  // Development & Coding
  // ============================================================================
  
  [AgentRole.FRONTEND_REVIEWER]: {
    id: AgentRole.FRONTEND_REVIEWER,
    name: 'Frontend Reviewer',
    description: 'Reviews frontend code for quality, performance, and UX',
    expertise: ['react', 'typescript', 'css', 'accessibility', 'performance'],
    phase: WorkflowPhase.REVIEW,
    promptTemplate: `You are a frontend code reviewer.
Review the following code with focus on:
- Component structure and reusability
- Type safety
- Performance optimizations
- Accessibility (a11y)
- Responsive design

Code: {{input}}

Provide specific line-by-line feedback.`,
    tools: ['linter', 'a11y-checker', 'perf-analyzer'],
  },
  
  [AgentRole.FULL_STACK_DEVELOPER]: {
    id: AgentRole.FULL_STACK_DEVELOPER,
    name: 'Full Stack Developer',
    description: 'Implements features across the entire stack',
    expertise: ['typescript', 'react', 'node', 'databases', 'apis'],
    phase: WorkflowPhase.WORK,
    promptTemplate: `You are a full stack developer.
Implement the following feature: {{input}}

Follow these principles:
1. Write clean, type-safe code
2. Include error handling
3. Add necessary tests
4. Follow existing code patterns

Output the complete implementation.`,
    tools: ['code-generator', 'test-generator', 'refactor-helper'],
  },
  
  [AgentRole.API_BUILDER]: {
    id: AgentRole.API_BUILDER,
    name: 'API Builder',
    description: 'Designs and implements REST/GraphQL APIs',
    expertise: ['rest', 'graphql', 'openapi', 'authentication', 'rate-limiting'],
    phase: WorkflowPhase.WORK,
    promptTemplate: `You are an API development specialist.
Implement the API for: {{input}}

Include:
1. Endpoint definitions with validation
2. Authentication/authorization checks
3. Error response formats
4. Rate limiting considerations
5. OpenAPI documentation`,
    tools: ['api-generator', 'validator', 'docs-generator'],
  },
  
  [AgentRole.DATABASE_OPTIMIZER]: {
    id: AgentRole.DATABASE_OPTIMIZER,
    name: 'Database Optimizer',
    description: 'Optimizes database schemas and queries',
    expertise: ['sql', 'query-optimization', 'indexing', 'migrations', 'nosql'],
    phase: WorkflowPhase.REVIEW,
    promptTemplate: `You are a database performance expert.
Review and optimize: {{input}}

Analyze:
1. Query performance
2. Index usage
3. Schema design
4. Migration safety
5. Connection pooling

Provide specific optimization recommendations.`,
    tools: ['query-analyzer', 'index-recommender'],
  },
  
  // ============================================================================
  // Quality & Testing
  // ============================================================================
  
  [AgentRole.CODE_REVIEWER]: {
    id: AgentRole.CODE_REVIEWER,
    name: 'Code Reviewer',
    description: 'General code quality reviewer focusing on best practices',
    expertise: ['clean-code', 'solid-principles', 'design-patterns', 'readability'],
    phase: WorkflowPhase.REVIEW,
    promptTemplate: `You are a senior code reviewer.
Review this code for: {{input}}

Check for:
1. Code clarity and readability
2. SOLID principles adherence
3. Proper error handling
4. Test coverage
5. Documentation

Provide constructive feedback with code examples.`,
    tools: ['static-analyzer', 'complexity-checker'],
  },
  
  [AgentRole.TEST_GENERATOR]: {
    id: AgentRole.TEST_GENERATOR,
    name: 'Test Generator',
    description: 'Creates comprehensive test suites',
    expertise: ['unit-testing', 'integration-testing', 'e2e', 'tdd', 'mocking'],
    phase: WorkflowPhase.WORK,
    promptTemplate: `You are a test automation specialist.
Generate tests for: {{input}}

Create:
1. Unit tests (edge cases, happy path, errors)
2. Integration tests
3. Test data fixtures
4. Mock/stub setup

Use the existing testing framework from the codebase.`,
    tools: ['test-generator', 'coverage-analyzer'],
  },
  
  [AgentRole.SECURITY_SCANNER]: {
    id: AgentRole.SECURITY_SCANNER,
    name: 'Security Scanner',
    description: 'Identifies security vulnerabilities and best practices',
    expertise: ['owasp', 'authentication', 'authorization', 'secrets-management', 'crypto'],
    phase: WorkflowPhase.REVIEW,
    promptTemplate: `You are a security engineer.
Security review for: {{input}}

Scan for:
1. Injection vulnerabilities
2. Authentication flaws
3. Sensitive data exposure
4. Access control issues
5. Secrets in code

Cite specific CWEs and provide fixes.`,
    tools: ['vulnerability-scanner', 'secrets-detector'],
  },
  
  [AgentRole.PERFORMANCE_ENGINEER]: {
    id: AgentRole.PERFORMANCE_ENGINEER,
    name: 'Performance Engineer',
    description: 'Optimizes code for speed and resource efficiency',
    expertise: ['profiling', 'caching', 'async-programming', 'memory-optimization', 'bundling'],
    phase: WorkflowPhase.REVIEW,
    promptTemplate: `You are a performance optimization specialist.
Analyze performance for: {{input}}

Identify:
1. Bottlenecks and slow operations
2. Memory leaks
3. Unnecessary re-renders/computations
4. Bundle size issues
5. Caching opportunities

Provide before/after code comparisons.`,
    tools: ['profiler', 'bundle-analyzer', 'memory-checker'],
  },
  
  // ============================================================================
  // DevOps & Deployment
  // ============================================================================
  
  [AgentRole.DEPLOYMENT_ENGINEER]: {
    id: AgentRole.DEPLOYMENT_ENGINEER,
    name: 'Deployment Engineer',
    description: 'Manages deployment processes and release strategies',
    expertise: ['ci-cd', 'blue-green', 'canary', 'rollback', 'feature-flags'],
    phase: WorkflowPhase.WORK,
    promptTemplate: `You are a deployment specialist.
Create deployment configuration for: {{input}}

Include:
1. CI/CD pipeline definition
2. Environment configurations
3. Deployment strategy (blue-green/canary)
4. Rollback procedures
5. Health checks`,
    tools: ['pipeline-generator', 'deploy-validator'],
  },
  
  [AgentRole.MONITORING_EXPERT]: {
    id: AgentRole.MONITORING_EXPERT,
    name: 'Monitoring Expert',
    description: 'Sets up observability, logging, and alerting',
    expertise: ['metrics', 'logging', 'tracing', 'alerting', 'dashboards'],
    phase: WorkflowPhase.WORK,
    promptTemplate: `You are an observability engineer.
Design monitoring for: {{input}}

Specify:
1. Key metrics to track
2. Log aggregation strategy
3. Alert rules and thresholds
4. Dashboard layouts
5. SLA definitions`,
    tools: ['dashboard-generator', 'alert-configurator'],
  },
  
  // ============================================================================
  // AI & ML
  // ============================================================================
  
  [AgentRole.AI_ENGINEER]: {
    id: AgentRole.AI_ENGINEER,
    name: 'AI Engineer',
    description: 'Implements AI/ML features and integrations',
    expertise: ['llm-integration', 'prompt-engineering', 'embeddings', 'vector-db'],
    phase: WorkflowPhase.WORK,
    promptTemplate: `You are an AI integration specialist.
Implement AI functionality for: {{input}}

Consider:
1. Model selection and API design
2. Prompt engineering best practices
3. Error handling and fallbacks
4. Cost optimization
5. Privacy and data handling`,
    tools: ['prompt-tester', 'model-selector'],
  },
  
  // ============================================================================
  // Spec & Research
  // ============================================================================
  
  [AgentRole.RESEARCH_ORCHESTRATOR]: {
    id: AgentRole.RESEARCH_ORCHESTRATOR,
    name: 'Research Orchestrator',
    description: 'Coordinates multi-phase research across codebase and external sources',
    expertise: ['code-analysis', 'documentation', 'tech-research', 'gap-analysis'],
    phase: WorkflowPhase.RESEARCH,
    promptTemplate: `You are a research coordinator.
Conduct comprehensive research on: {{input}}

Phases:
1. Codebase analysis - understand current implementation
2. External research - best practices and patterns
3. Gap analysis - what's missing vs requirements
4. Synthesis - actionable recommendations

Structure findings clearly with citations.`,
    tools: ['code-search', 'doc-reader', 'web-search'],
  },
  
  [AgentRole.SPEC_WRITER]: {
    id: AgentRole.SPEC_WRITER,
    name: 'Spec Writer',
    description: 'Creates detailed feature specifications using TCRO framework',
    expertise: ['requirements', 'tcro-framework', 'user-stories', 'acceptance-criteria'],
    phase: WorkflowPhase.SPECIFY,
    promptTemplate: `You are a technical specification writer.
Create a feature spec for: {{input}}

Use TCRO framework:
- Test Cases: Define how to verify (Given/When/Then)
- Constraints: Technical, business, legal limitations
- Resources: APIs, databases, services needed
- Objectives: Measurable success criteria

Write clear, unambiguous specifications.`,
    tools: ['spec-template', 'tcro-validator'],
  },
};

// ============================================================================
// Agent Groupings
// ============================================================================

export const AgentGroups = {
  ARCHITECTURE: [
    AgentRole.ARCHITECT_ADVISOR,
    AgentRole.BACKEND_ARCHITECT,
    AgentRole.INFRASTRUCTURE_BUILDER,
  ],
  DEVELOPMENT: [
    AgentRole.FULL_STACK_DEVELOPER,
    AgentRole.API_BUILDER,
    AgentRole.FRONTEND_REVIEWER,
    AgentRole.DATABASE_OPTIMIZER,
  ],
  QUALITY: [
    AgentRole.CODE_REVIEWER,
    AgentRole.TEST_GENERATOR,
    AgentRole.SECURITY_SCANNER,
    AgentRole.PERFORMANCE_ENGINEER,
  ],
  DEVOPS: [
    AgentRole.DEPLOYMENT_ENGINEER,
    AgentRole.MONITORING_EXPERT,
    AgentRole.INFRASTRUCTURE_BUILDER,
  ],
  PLANNING: [
    AgentRole.RESEARCH_ORCHESTRATOR,
    AgentRole.SPEC_WRITER,
    AgentRole.ARCHITECT_ADVISOR,
  ],
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

export function getAgentByRole(role: AgentRole): Agent | undefined {
  return AGENTS[role];
}

export function getAgentsByPhase(phase: WorkflowPhase): Agent[] {
  return Object.values(AGENTS).filter(
    (agent) => agent.phase === phase || agent.phase === 'any'
  );
}

export function getAllAgentRoles(): AgentRole[] {
  return Object.keys(AGENTS) as AgentRole[];
}
