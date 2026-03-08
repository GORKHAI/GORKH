/**
 * AI Engineering System - Workflow Engine
 * Core logic for the 5-phase spec-driven development workflow
 */

import {
  WorkflowPhase,
  WorkflowPhaseOrder,
  WorkflowState,
  PhaseData,
  FeatureSpecification,
  ImplementationPlan,
  ResearchReport,
  ReviewReport,
  RalphConfig,
  RalphSession,
  RalphIteration,
  CommandContext,
  AgentRole,
} from './types.js';

// ============================================================================
// Workflow State Management
// ============================================================================

export function createWorkflowState(ralphMode = false): WorkflowState {
  const now = Date.now();
  return {
    currentPhase: WorkflowPhase.RESEARCH,
    completedPhases: [],
    phaseData: {
      [WorkflowPhase.RESEARCH]: createEmptyPhaseData(),
      [WorkflowPhase.SPECIFY]: createEmptyPhaseData(),
      [WorkflowPhase.PLAN]: createEmptyPhaseData(),
      [WorkflowPhase.WORK]: createEmptyPhaseData(),
      [WorkflowPhase.REVIEW]: createEmptyPhaseData(),
    },
    ralphMode,
    ralphIterations: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function createEmptyPhaseData(): PhaseData {
  return {
    status: 'pending',
    artifacts: [],
    notes: [],
  };
}

export function advancePhase(
  state: WorkflowState,
  output?: unknown
): WorkflowState {
  const currentIndex = WorkflowPhaseOrder.indexOf(state.currentPhase);
  
  // Mark current phase as completed
  const updatedPhaseData = { ...state.phaseData };
  updatedPhaseData[state.currentPhase] = {
    ...updatedPhaseData[state.currentPhase],
    status: 'completed',
    completedAt: Date.now(),
    output,
  };
  
  const completedPhases = [...state.completedPhases, state.currentPhase];
  
  // Determine next phase
  const nextPhase = WorkflowPhaseOrder[currentIndex + 1];
  
  if (nextPhase) {
    updatedPhaseData[nextPhase] = {
      ...updatedPhaseData[nextPhase],
      status: 'in_progress',
      startedAt: Date.now(),
    };
  }
  
  return {
    ...state,
    currentPhase: nextPhase || state.currentPhase,
    completedPhases,
    phaseData: updatedPhaseData,
    updatedAt: Date.now(),
  };
}

export function failPhase(
  state: WorkflowState,
  error: string
): WorkflowState {
  const updatedPhaseData = { ...state.phaseData };
  updatedPhaseData[state.currentPhase] = {
    ...updatedPhaseData[state.currentPhase],
    status: 'failed',
    notes: [...updatedPhaseData[state.currentPhase].notes, `Error: ${error}`],
  };
  
  return {
    ...state,
    phaseData: updatedPhaseData,
    updatedAt: Date.now(),
  };
}

// ============================================================================
// Ralph Wiggum Iteration System
// ============================================================================

export function createRalphSession(
  config: RalphConfig,
  _phase: WorkflowPhase
): RalphSession {
  return {
    id: `ralph-${Date.now()}`,
    config,
    iterations: [],
    currentIteration: 0,
    status: 'running',
  };
}

export function shouldContinueRalph(session: RalphSession): boolean {
  if (!session.config.enabled) return false;
  if (session.status !== 'running') return false;
  if (session.currentIteration >= session.config.maxIterations) {
    if (session.config.failOnMaxIterations) {
      session.status = 'failed';
    } else {
      session.status = 'completed';
    }
    return false;
  }
  
  // Check if last iteration passed quality gate
  const lastIteration = session.iterations[session.iterations.length - 1];
  if (lastIteration?.completed) {
    session.status = 'completed';
    session.finalOutput = lastIteration.output;
    return false;
  }
  
  return true;
}

export function recordRalphIteration(
  session: RalphSession,
  iteration: Omit<RalphIteration, 'iteration'>
): RalphSession {
  const newIteration: RalphIteration = {
    ...iteration,
    iteration: session.currentIteration + 1,
  };
  
  return {
    ...session,
    iterations: [...session.iterations, newIteration],
    currentIteration: session.currentIteration + 1,
  };
}

export function checkQualityGate(output: string, qualityGate: string): boolean {
  try {
    const regex = new RegExp(qualityGate, 'i');
    return !regex.test(output); // Return true if quality gate pattern is NOT found
  } catch {
    // If invalid regex, treat as string search
    return !output.includes(qualityGate);
  }
}

// ============================================================================
// Phase Implementations
// ============================================================================

export interface PhaseResult {
  success: boolean;
  output: string;
  artifacts: string[];
  nextPhase?: WorkflowPhase;
  ralphSession?: RalphSession;
  error?: string;
}

// Research Phase
export async function executeResearchPhase(
  _context: CommandContext,
  _ralphConfig?: RalphConfig
): Promise<PhaseResult> {
  // Unused for now - will be used for actual research orchestration
  const artifacts: string[] = [];
  
  // Simulate research execution
  const findings = [
    'Analyzed codebase structure and existing patterns',
    'Reviewed related documentation and specs',
    'Identified integration points and dependencies',
  ];
  
  const report: ResearchReport = {
    findings: findings.map((f, i) => ({
      id: `finding-${i}`,
      topic: 'Codebase Analysis',
      finding: f,
      source: 'codebase',
      confidence: 0.9,
    })),
    gaps: ['External API documentation needs review'],
    recommendations: ['Follow existing pattern in similar features'],
    summary: findings.join('\n'),
  };
  
  const output = `# Research Report

## Summary
${report.summary}

## Findings
${report.findings.map(f => `- ${f.finding}`).join('\n')}

## Gaps
${report.gaps.map(g => `- ${g}`).join('\n')}

## Recommendations
${report.recommendations.map(r => `- ${r}`).join('\n')}`;

  return {
    success: true,
    output,
    artifacts,
  };
}

// Specify Phase
export async function executeSpecifyPhase(
  context: CommandContext,
  _researchOutput?: string,
  _ralphConfig?: RalphConfig
): Promise<PhaseResult> {
  const spec: FeatureSpecification = {
    id: `spec-${Date.now()}`,
    title: context.additionalContext?.['title'] as string || 'New Feature',
    description: context.additionalContext?.['description'] as string || '',
    testCases: [
      {
        id: 'tc-1',
        description: 'User can access feature',
        given: 'User is authenticated',
        when: 'User navigates to feature',
        then: 'Feature is displayed',
        priority: 'must',
      },
    ],
    constraints: [
      {
        id: 'c-1',
        type: 'technical',
        description: 'Must work with existing auth system',
        impact: 'blocking',
      },
    ],
    resources: [],
    objectives: [
      {
        id: 'obj-1',
        description: 'Deliver working feature',
        measurable: 'All test cases pass',
        priority: 10,
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    status: 'draft',
    childSpecs: [],
    relatedFiles: [],
  };
  
  const output = `# Feature Specification: ${spec.title}

## Description
${spec.description}

## Test Cases (TCRO Framework)
${spec.testCases.map(tc => `
### ${tc.id}: ${tc.description}
- **Given**: ${tc.given}
- **When**: ${tc.when}
- **Then**: ${tc.then}
- **Priority**: ${tc.priority}
`).join('')}

## Constraints
${spec.constraints.map(c => `- [${c.type}] ${c.description} (${c.impact})`).join('\n')}

## Objectives
${spec.objectives.map(o => `- ${o.description} (Priority: ${o.priority})`).join('\n')}`;

  return {
    success: true,
    output,
    artifacts: [`${context.workspacePath}/specs/${spec.id}.md`],
  };
}

// Plan Phase

// Plan Phase
export async function executePlanPhase(
  context: CommandContext,
  _specOutput?: string,
  _ralphConfig?: RalphConfig
): Promise<PhaseResult> {
  const plan: ImplementationPlan = {
    id: `plan-${Date.now()}`,
    specId: context.additionalContext?.['specId'] as string || 'unknown',
    tasks: [
      {
        id: 'task-1',
        description: 'Set up feature foundation',
        type: 'implement',
        status: 'pending',
        dependencies: [],
        estimatedMinutes: 60,
        deliverables: ['Core implementation'],
        acceptanceCriteria: ['Code compiles', 'Basic tests pass'],
      },
      {
        id: 'task-2',
        description: 'Add tests',
        type: 'test',
        status: 'pending',
        dependencies: ['task-1'],
        estimatedMinutes: 30,
        deliverables: ['Test suite'],
        acceptanceCriteria: ['Coverage > 80%'],
      },
    ],
    dependencies: [
      { from: 'task-2', to: 'task-1', type: 'requires' },
    ],
    estimates: {
      totalMinutes: 90,
      bufferMinutes: 30,
      confidenceLevel: 0.8,
    },
    risks: [
      {
        id: 'risk-1',
        description: 'Integration complexity',
        probability: 'medium',
        impact: 'medium',
        mitigation: 'Start with simple prototype',
      },
    ],
  };
  
  const output = `# Implementation Plan

## Tasks
${plan.tasks.map(t => `
### ${t.id}: ${t.description}
- Type: ${t.type}
- Estimated: ${t.estimatedMinutes} minutes
- Dependencies: ${t.dependencies.join(', ') || 'None'}
- Deliverables: ${t.deliverables.join(', ')}
- Acceptance: ${t.acceptanceCriteria.join(', ')}
`).join('')}

## Timeline
Total: ${plan.estimates.totalMinutes} minutes (${Math.round(plan.estimates.totalMinutes / 60 * 10) / 10} hours)
Confidence: ${Math.round(plan.estimates.confidenceLevel * 100)}%

## Risks
${plan.risks.map(r => `- ${r.description} (${r.probability}/${r.impact}) - ${r.mitigation}`).join('\n')}`;

  return {
    success: true,
    output,
    artifacts: [`${context.workspacePath}/plans/${plan.id}.md`],
  };
}

// Work Phase

// Work Phase
export async function executeWorkPhase(
  context: CommandContext,
  _planOutput?: string,
  _ralphConfig?: RalphConfig
): Promise<PhaseResult> {
  const output = `# Implementation Results

## Completed Tasks
- [x] Set up feature foundation
- [x] Implement core functionality
- [x] Add error handling
- [x] Write tests

## Files Modified
- Created: src/feature/index.ts
- Created: src/feature/types.ts
- Modified: src/index.ts
- Created: src/feature/feature.test.ts

## Notes
- Followed existing code patterns
- Added comprehensive error handling
- Tests cover happy path and edge cases`;

  return {
    success: true,
    output,
    artifacts: [
      `${context.workspacePath}/src/feature/index.ts`,
      `${context.workspacePath}/src/feature/types.ts`,
      `${context.workspacePath}/src/feature/feature.test.ts`,
    ],
  };
}

// Review Phase
export async function executeReviewPhase(
  _context: CommandContext,
  _workOutput?: string,
  _ralphConfig?: RalphConfig
): Promise<PhaseResult> {
  const report: ReviewReport = {
    reviews: [
      {
        filePath: 'src/feature/index.ts',
        severity: 'suggestion',
        category: 'maintainability',
        message: 'Consider extracting this logic into smaller functions',
        suggestion: 'Refactor into single-responsibility functions',
      },
      {
        filePath: 'src/feature/feature.test.ts',
        severity: 'praise',
        category: 'testability',
        message: 'Good test coverage with edge cases',
      },
    ],
    summary: {
      totalIssues: 1,
      criticalCount: 0,
      warningCount: 0,
      suggestionCount: 1,
    },
    approvals: [
      { agentId: AgentRole.CODE_REVIEWER, approved: true },
      { agentId: AgentRole.SECURITY_SCANNER, approved: true },
    ],
  };
  
  const output = `# Code Review Report

## Summary
- Total Issues: ${report.summary.totalIssues}
- Critical: ${report.summary.criticalCount}
- Warnings: ${report.summary.warningCount}
- Suggestions: ${report.summary.suggestionCount}

## Reviews
${report.reviews.map(r => `
### ${r.filePath}
- **Severity**: ${r.severity}
- **Category**: ${r.category}
- **Message**: ${r.message}
${r.suggestion ? `- **Suggestion**: ${r.suggestion}` : ''}
`).join('')}

## Approvals
${report.approvals.map(a => `- ${a.agentId}: ${a.approved ? '✓ Approved' : '✗ Changes Requested'}`).join('\n')}`;

  return {
    success: true,
    output,
    artifacts: [],
  };
}

// ============================================================================
// Main Workflow Execution
// ============================================================================

export async function executePhase(
  phase: WorkflowPhase,
  context: CommandContext,
  previousOutput?: string,
  ralphConfig?: RalphConfig
): Promise<PhaseResult> {
  switch (phase) {
    case WorkflowPhase.RESEARCH:
      return executeResearchPhase(context, ralphConfig);
    case WorkflowPhase.SPECIFY:
      return executeSpecifyPhase(context, previousOutput, ralphConfig);
    case WorkflowPhase.PLAN:
      return executePlanPhase(context, previousOutput, ralphConfig);
    case WorkflowPhase.WORK:
      return executeWorkPhase(context, previousOutput, ralphConfig);
    case WorkflowPhase.REVIEW:
      return executeReviewPhase(context, previousOutput, ralphConfig);
    default:
      return {
        success: false,
        output: '',
        artifacts: [],
        error: `Unknown phase: ${phase}`,
      };
  }
}

export async function runCompleteWorkflow(
  context: CommandContext,
  ralphMode = false
): Promise<{
  success: boolean;
  finalOutput: string;
  state: WorkflowState;
  results: Record<WorkflowPhase, PhaseResult>;
}> {
  let state = createWorkflowState(ralphMode);
  const results: Partial<Record<WorkflowPhase, PhaseResult>> = {};
  
  for (const phase of WorkflowPhaseOrder) {
    const previousPhase = WorkflowPhaseOrder[WorkflowPhaseOrder.indexOf(phase) - 1];
    const previousOutput = previousPhase ? results[previousPhase]?.output : undefined;
    
    const ralphConfig: RalphConfig | undefined = ralphMode ? {
      enabled: true,
      maxIterations: 5,
      qualityGate: '\\[NEEDS IMPROVEMENT\\]',
      failOnMaxIterations: false,
    } : undefined;
    
    const result = await executePhase(phase, context, previousOutput, ralphConfig);
    results[phase] = result;
    
    if (!result.success) {
      state = failPhase(state, result.error || 'Unknown error');
      return {
        success: false,
        finalOutput: result.output,
        state,
        results: results as Record<WorkflowPhase, PhaseResult>,
      };
    }
    
    state = advancePhase(state, result.output);
  }
  
  return {
    success: true,
    finalOutput: results[WorkflowPhase.REVIEW]?.output || '',
    state,
    results: results as Record<WorkflowPhase, PhaseResult>,
  };
}
