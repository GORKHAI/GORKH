import { type SolanaShieldRpcAnalysis, type SolanaShieldRiskFinding } from '@gorkh/shared';

export interface ShieldContextInput {
  analysis: SolanaShieldRpcAnalysis | null;
}

export function createShieldContextMarkdown(input: ShieldContextInput): string {
  const { analysis } = input;
  const lines: string[] = [];

  lines.push('# GORKH Shield Context');
  lines.push('');
  lines.push('> **Shield analysis is advisory and does not guarantee transaction safety.**');
  lines.push('> This summary does not include raw full transactions unless explicitly copied.');
  lines.push('');

  if (!analysis) {
    lines.push('No Shield analysis is currently available.');
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`## Input`);
  lines.push(`- **Kind:** ${analysis.inputKind.replace(/_/g, ' ')}`);
  lines.push(`- **Network:** ${analysis.network}`);
  lines.push('');

  lines.push(`## Summary`);
  lines.push(analysis.summary);
  lines.push('');

  const findings = analysis.riskFindings as SolanaShieldRiskFinding[];
  if (findings.length > 0) {
    lines.push(`## Risk Findings (${findings.length})`);
    for (const finding of findings) {
      lines.push(`### ${finding.title} (${finding.level})`);
      lines.push(finding.description);
      if (finding.recommendation) {
        lines.push(`*Recommendation:* ${finding.recommendation}`);
      }
      lines.push('');
    }
  } else {
    lines.push('## Risk Findings');
    lines.push('No risk findings detected in this analysis.');
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('*Shield analysis is advisory. Always review transactions manually before any future signing.*');
  lines.push('');

  return lines.join('\n');
}
