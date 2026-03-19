import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workspaceSource = readFileSync('apps/desktop/src-tauri/src/workspace.rs', 'utf8');

test('desktop workspace configuration persists across restarts through a local state file', () => {
  assert.match(
    workspaceSource,
    /fn workspace_state_file_path\(\) -> PathBuf/,
    'workspace module should define a stable persisted state file path',
  );

  assert.match(
    workspaceSource,
    /fn write_workspace_root_to_file\(state_file: &Path,\s*root: &Path\) -> Result<\(\), String>/,
    'workspace module should be able to persist the configured root to disk',
  );

  assert.match(
    workspaceSource,
    /fn read_workspace_root_from_file\(state_file: &Path\) -> Option<PathBuf>/,
    'workspace module should be able to restore the configured root from disk',
  );

  assert.match(
    workspaceSource,
    /write_workspace_root_to_file\(&workspace_state_file_path\(\), &path_buf\)/,
    'workspace_configure should persist the selected root after validation',
  );

  assert.match(
    workspaceSource,
    /let state_file = workspace_state_file_path\(\);[\s\S]*read_workspace_root_from_file\(&state_file\)/,
    'workspace state resolution should restore the persisted root on restart',
  );

  assert.match(
    workspaceSource,
    /remove_file\(&workspace_state_file_path\(\)\)|remove_workspace_state_file\(\)/,
    'workspace_clear should remove the persisted state file',
  );
});

test('desktop workspace tool execution resolves the persisted workspace root before rejecting unconfigured tool calls', () => {
  assert.match(
    workspaceSource,
    /fn current_workspace_root\(\) -> Option<PathBuf>/,
    'workspace module should have a single helper that resolves cached or persisted workspace state',
  );

  assert.match(
    workspaceSource,
    /let root = current_workspace_root\(\)\.ok_or\(ToolError/,
    'tool execution should consult the persisted workspace root before failing as unconfigured',
  );
});
