/**
 * AI Engineering System - Agent Types
 * Core type definitions for the 5-phase workflow and agent system
 */

// ============================================================================
// 5-Phase Workflow Types
// ============================================================================

export const WorkflowPhase = {
  RESEARCH: 'research',
  SPECIFY: 'specify',
  PLAN: 'plan',
  WORK: 'work',
  REVIEW: 'review',
} as const;

export type WorkflowPhase = (typeof WorkflowPhase)[keyof typeof WorkflowPhase];

export const WorkflowPhaseOrder: WorkflowPhase[] = [
  WorkflowPhase.RESEARCH,
  WorkflowPhase.SPECIFY,
  WorkflowPhase.PLAN,
  WorkflowPhase.WORK,
  WorkflowPhase.REVIEW,
];

export interface WorkflowState {
  currentPhase: WorkflowPhase;
  completedPhases: WorkflowPhase[];
  phaseData: Record<WorkflowPhase, PhaseData>;
  ralphMode: boolean;
  ralphIterations: number;
  createdAt: number;
  updatedAt: number;
}

export interface PhaseData {
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: number;
  completedAt?: number;
  output?: unknown;
  artifacts: string[]; // File paths
  notes: string[];
}

// ============================================================================
// Agent Types
// ============================================================================

export const AgentRole = {
  // Architecture & Planning
  ARCHITECT_ADVISOR: 'architect-advisor',
  BACKEND_ARCHITECT: 'backend-architect',
  INFRASTRUCTURE_BUILDER: 'infrastructure-builder',
  
  // Development & Coding
  FRONTEND_REVIEWER: 'frontend-reviewer',
  FULL_STACK_DEVELOPER: 'full-stack-developer',
  API_BUILDER: 'api-builder',
  DATABASE_OPTIMIZER: 'database-optimizer',
  
  // Quality & Testing
  CODE_REVIEWER: 'code-reviewer',
  TEST_GENERATOR: 'test-generator',
  SECURITY_SCANNER: 'security-scanner',
  PERFORMANCE_ENGINEER: 'performance-engineer',
  
  // DevOps & Deployment
  DEPLOYMENT_ENGINEER: 'deployment-engineer',
  MONITORING_EXPERT: 'monitoring-expert',
  
  // AI & ML
  AI_ENGINEER: 'ai-engineer',
  
  // General
  RESEARCH_ORCHESTRATOR: 'research-orchestrator',
  SPEC_WRITER: 'spec-writer',
} as const;

export type AgentRole = (typeof AgentRole)[keyof typeof AgentRole];

export interface Agent {
  id: AgentRole;
  name: string;
  description: string;
  expertise: string[];
  phase: WorkflowPhase | 'any';
  promptTemplate: string;
  tools: string[];
}

export interface AgentInvocation {
  agentId: AgentRole;
  input: string;
  context?: Record<string, unknown>;
  phase: WorkflowPhase;
  ralphMode?: boolean;
}

export interface AgentResponse {
  agentId: AgentRole;
  output: string;
  artifacts: string[];
  suggestions: string[];
  confidence: number; // 0-1
  nextAction?: 'continue' | 'retry' | 'escalate' | 'complete';
}

// ============================================================================
// Specification Types (TCRO Framework)
// ============================================================================

export interface FeatureSpecification {
  id: string;
  title: string;
  description: string;
  
  // TCRO Framework
  testCases: TestCase[];
  constraints: Constraint[];
  resources: Resource[];
  objectives: Objective[];
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  version: number;
  status: 'draft' | 'review' | 'approved' | 'implemented';
  
  // Relationships
  parentSpec?: string;
  childSpecs: string[];
  relatedFiles: string[];
}

export interface TestCase {
  id: string;
  description: string;
  given: string;
  when: string;
  then: string;
  priority: 'must' | 'should' | 'could';
}

export interface Constraint {
  id: string;
  type: 'technical' | 'business' | 'legal' | 'performance';
  description: string;
  impact: 'blocking' | 'warning' | 'info';
}

export interface Resource {
  id: string;
  type: 'api' | 'database' | 'service' | 'library' | 'hardware';
  name: string;
  requirements: string;
}

export interface Objective {
  id: string;
  description: string;
  measurable: string;
  priority: number; // 1-10
}

// ============================================================================
// Research Types
// ============================================================================

export interface ResearchContext {
  codebasePath: string;
  externalSources: string[];
  focusAreas: string[];
  depth: 'surface' | 'standard' | 'deep';
}

export interface ResearchFinding {
  id: string;
  topic: string;
  finding: string;
  source: 'codebase' | 'external' | 'inference';
  confidence: number;
  relatedFiles?: string[];
}

export interface ResearchReport {
  findings: ResearchFinding[];
  gaps: string[];
  recommendations: string[];
  summary: string;
}

// ============================================================================
// Plan Types
// ============================================================================

export interface ImplementationPlan {
  id: string;
  specId: string;
  tasks: Task[];
  dependencies: Dependency[];
  estimates: Estimates;
  risks: Risk[];
}

export interface Task {
  id: string;
  description: string;
  type: 'research' | 'design' | 'implement' | 'test' | 'review' | 'deploy';
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assignedAgent?: AgentRole;
  dependencies: string[];
  estimatedMinutes: number;
  actualMinutes?: number;
  deliverables: string[];
  acceptanceCriteria: string[];
}

export interface Dependency {
  from: string;
  to: string;
  type: 'blocks' | 'requires' | 'enhances';
}

export interface Estimates {
  totalMinutes: number;
  bufferMinutes: number;
  confidenceLevel: number;
}

export interface Risk {
  id: string;
  description: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  mitigation: string;
}

// ============================================================================
// Ralph Wiggum Iteration Types
// ============================================================================

export interface RalphConfig {
  enabled: boolean;
  maxIterations: number;
  qualityGate: string; // Regex or pattern to check for completion
  focusArea?: string;
  failOnMaxIterations: boolean;
}

export interface RalphIteration {
  iteration: number;
  phase: WorkflowPhase;
  input: string;
  output: string;
  qualityScore: number;
  issues: string[];
  improvements: string[];
  completed: boolean;
}

export interface RalphSession {
  id: string;
  config: RalphConfig;
  iterations: RalphIteration[];
  currentIteration: number;
  status: 'running' | 'completed' | 'failed';
  finalOutput?: string;
}

// ============================================================================
// Review Types
// ============================================================================

export const ReviewPerspective = {
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  MAINTAINABILITY: 'maintainability',
  TESTABILITY: 'testability',
  ARCHITECTURE: 'architecture',
  UX: 'ux',
  ACCESSIBILITY: 'accessibility',
} as const;

export type ReviewPerspective = (typeof ReviewPerspective)[keyof typeof ReviewPerspective];

export interface CodeReview {
  filePath: string;
  lineRange?: [number, number];
  severity: 'critical' | 'warning' | 'suggestion' | 'praise';
  category: ReviewPerspective;
  message: string;
  suggestion?: string;
  rationale?: string;
}

export interface ReviewReport {
  reviews: CodeReview[];
  summary: {
    totalIssues: number;
    criticalCount: number;
    warningCount: number;
    suggestionCount: number;
  };
  approvals: {
    agentId: AgentRole;
    approved: boolean;
    conditions?: string[];
  }[];
}

// ============================================================================
// Command Types
// ============================================================================

export interface CommandContext {
  workspacePath: string;
  specPath?: string;
  planPath?: string;
  ralphConfig?: RalphConfig;
  additionalContext?: Record<string, unknown>;
}

export interface CommandResult {
  success: boolean;
  phase: WorkflowPhase;
  output: string;
  artifacts: string[];
  nextPhase?: WorkflowPhase;
  ralphSession?: RalphSession;
  error?: string;
}
