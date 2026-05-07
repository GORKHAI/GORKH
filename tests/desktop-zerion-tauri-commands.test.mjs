import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const libSource = readFileSync('apps/desktop/src-tauri/src/lib.rs', 'utf8');
const permissionSource = readFileSync('apps/desktop/src-tauri/permissions/desktop-ipc.toml', 'utf8');

const zerionCommands = [
  'zerion_cli_detect',
  'zerion_cli_version',
  'zerion_cli_config_status',
  'zerion_api_key_set',
  'zerion_api_key_clear',
  'zerion_cli_wallet_list',
  'zerion_cli_agent_list_policies',
  'zerion_cli_agent_create_policy',
  'zerion_cli_agent_list_tokens',
  'zerion_cli_agent_create_token',
  'zerion_cli_portfolio',
  'zerion_cli_positions',
  'zerion_cli_swap_tokens',
  'zerion_cli_swap_execute',
];

test('Zerion Tauri commands are explicit and allowlisted', () => {
  for (const command of zerionCommands) {
    assert.match(libSource, new RegExp(`#\\s*\\[tauri::command\\][\\s\\S]*fn\\s+${command}\\b`));
    assert.match(permissionSource, new RegExp(`"${command}"`));
  }
  assert.doesNotMatch(permissionSource, /"\*"/);
});

test('Zerion runner uses Command with args array and blocks arbitrary shell execution', () => {
  assert.match(libSource, /std::process::Command::new\(binary\)/);
  assert.match(libSource, /\.args\(&args\)/);
  assert.match(libSource, /validate_zerion_binary/);
  assert.match(libSource, /contains_shell_metachar/);
  assert.doesNotMatch(libSource, /Command::new\("sh"\)|Command::new\("bash"\)|\.arg\("-c"\)/);
});

test('Zerion execution validates Agent panel source and blocks bridge-send bypasses', () => {
  assert.match(libSource, /agent_zerion_panel/);
  assert.match(libSource, /Only SOL to USDC swaps are allowed/);
  assert.match(libSource, /Bridge, send, and transfer bypasses must be disabled/);
  assert.match(libSource, /real onchain transaction/);
});

test('Zerion secrets are keychain/env child-process only and redacted from output', () => {
  assert.match(libSource, /zerion_api_key_account/);
  assert.match(libSource, /keyring_set_secret\(zerion_api_key_account\(\), &request\.api_key\)/);
  assert.match(libSource, /command\.env\("ZERION_API_KEY", api_key\)/);
  assert.match(libSource, /redact_zerion_output/);
  assert.doesNotMatch(libSource, /println!\([^)]*ZERION_API_KEY|dbg!\([^)]*api_key/);
});

