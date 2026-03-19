import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const libSource = readFileSync('apps/desktop/src-tauri/src/lib.rs', 'utf8');

test('desktop selected-display pointer mapping resolves absolute coordinates from display origin and size', () => {
  assert.match(
    libSource,
    /fn resolve_display_point\(x_norm: f64,\s*y_norm: f64,\s*bounds: DisplayBounds\) -> \(i32, i32\)/,
    'desktop input mapping should use a dedicated helper for normalized-to-absolute display coordinates',
  );

  assert.match(
    libSource,
    /struct DisplayBounds\s*\{\s*x: i32,\s*y: i32,\s*width: u32,\s*height: u32,\s*\}/,
    'desktop input mapping should carry both display origin and display size',
  );

  assert.match(
    libSource,
    /screen\.display_info\.x[\s\S]{0,200}screen\.display_info\.y/,
    'desktop input mapping should read the selected display origin from the native screen metadata',
  );
});

test('desktop click and double-click map pointer coordinates through the selected display origin helper', () => {
  assert.match(
    libSource,
    /let \(x, y\) = resolve_display_point\(\s*x_norm,\s*y_norm,\s*DisplayBounds\s*\{/,
    'desktop click commands should resolve the absolute pointer position through the shared display helper',
  );

  assert.match(
    libSource,
    /fn input_double_click\([\s\S]*let \(x, y\) = resolve_display_point\(\s*x_norm,\s*y_norm,\s*DisplayBounds\s*\{/,
    'desktop double-click commands should resolve the absolute pointer position through the shared display helper',
  );
});
