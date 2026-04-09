#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';

export const CHECK_DEFINITIONS = {
  confirmed_task_local_free_ai: 'Confirmed task on local Free AI',
  non_workspace_non_screen_task: 'Non-workspace / non-screen task',
  hosted_fallback_unavailable: 'Hosted fallback unavailable behavior',
  overlay_and_dragging: 'Overlay and normal window dragging',
  beta_updater_truth: 'Beta updater truth',
  stable_updater_truth: 'Stable updater truth',
};

export const COMMON_REQUIRED_CHECKS = [
  'confirmed_task_local_free_ai',
  'non_workspace_non_screen_task',
  'hosted_fallback_unavailable',
  'overlay_and_dragging',
];

export const CHANNEL_REQUIRED_CHECKS = {
  beta: ['beta_updater_truth'],
  stable: ['stable_updater_truth'],
};

export const IRRELEVANT_CHANNEL_CHECK = {
  beta: 'stable_updater_truth',
  stable: 'beta_updater_truth',
};

export const ALLOWED_STATUSES = new Set(['pending', 'pass', 'fail', 'not_applicable']);

function usage() {
  console.error(
    [
      'Usage:',
      '  node scripts/release/verify-packaged-desktop-report.mjs --template --channel <beta|stable> --version <version> --machine <machine>',
      '  node scripts/release/verify-packaged-desktop-report.mjs --report <path>',
    ].join('\n'),
  );
}

export function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index];
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const key = token.slice(2);
    const next = rawArgs[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

export function assertValidChannel(channel) {
  if (channel !== 'beta' && channel !== 'stable') {
    throw new Error(`Expected channel to be beta or stable, received: ${String(channel)}`);
  }
}

export function createTemplate({ channel, version, machine }) {
  assertValidChannel(channel);

  const template = {
    version,
    channel,
    machine,
    checkedAt: '',
    checks: {},
  };

  for (const [checkId, label] of Object.entries(CHECK_DEFINITIONS)) {
    template.checks[checkId] = {
      label,
      status: checkId === IRRELEVANT_CHANNEL_CHECK[channel] ? 'not_applicable' : 'pending',
      notes: '',
    };
  }

  return template;
}

export function validateReportShape(report) {
  if (!report || typeof report !== 'object') {
    throw new Error('Packaged desktop report must be a JSON object');
  }

  if (typeof report.version !== 'string' || !report.version.trim()) {
    throw new Error('Packaged desktop report requires a non-empty version');
  }

  assertValidChannel(report.channel);

  if (typeof report.machine !== 'string' || !report.machine.trim()) {
    throw new Error('Packaged desktop report requires a non-empty machine identifier');
  }

  if (!report.checks || typeof report.checks !== 'object') {
    throw new Error('Packaged desktop report requires a checks object');
  }

  for (const checkId of Object.keys(CHECK_DEFINITIONS)) {
    const check = report.checks[checkId];
    if (!check || typeof check !== 'object') {
      throw new Error(`Missing packaged desktop check: ${checkId}`);
    }
    if (!ALLOWED_STATUSES.has(check.status)) {
      throw new Error(`Invalid status for ${checkId}: ${String(check.status)}`);
    }
  }
}

export function verifyRequiredChecks(report) {
  const requiredChecks = [
    ...COMMON_REQUIRED_CHECKS,
    ...CHANNEL_REQUIRED_CHECKS[report.channel],
  ];

  const failures = [];

  for (const checkId of requiredChecks) {
    const check = report.checks[checkId];
    if (check.status !== 'pass') {
      failures.push(`${checkId} must be pass (found ${check.status})`);
    }
  }

  const irrelevantCheckId = IRRELEVANT_CHANNEL_CHECK[report.channel];
  const irrelevantCheck = report.checks[irrelevantCheckId];
  if (irrelevantCheck.status !== 'not_applicable') {
    failures.push(`${irrelevantCheckId} must be not_applicable for ${report.channel} reports`);
  }

  return failures;
}

export async function loadReport(reportPath) {
  const raw = await readFile(reportPath, 'utf8');
  return JSON.parse(raw);
}

export async function validatePackagedDesktopReport(reportPath) {
  const report = await loadReport(reportPath);
  validateReportShape(report);
  const failures = verifyRequiredChecks(report);
  return { report, failures };
}

async function main() {
  let args;
  try {
    args = parseArgs(argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    usage();
    exit(1);
    return;
  }

  if (args.template) {
    try {
      const channel = String(args.channel || '');
      const version = String(args.version || '');
      const machine = String(args.machine || '');
      if (!version.trim()) {
        throw new Error('Template generation requires --version');
      }
      if (!machine.trim()) {
        throw new Error('Template generation requires --machine');
      }

      const template = createTemplate({ channel, version, machine });
      console.log(JSON.stringify(template, null, 2));
      return;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      usage();
      exit(1);
      return;
    }
  }

  if (typeof args.report === 'string') {
    try {
      const { report, failures } = await validatePackagedDesktopReport(args.report);
      if (failures.length > 0) {
        console.error('Packaged desktop report is incomplete:');
        for (const failure of failures) {
          console.error(`- ${failure}`);
        }
        exit(1);
        return;
      }

      console.log(
        `Validated packaged desktop report for ${report.channel} ${report.version} on ${report.machine}.`,
      );
      return;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      exit(1);
      return;
    }
  }

  usage();
  exit(1);
}

if (argv[1] && fileURLToPath(import.meta.url) === argv[1]) {
  await main();
}
