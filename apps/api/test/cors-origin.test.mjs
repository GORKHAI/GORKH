import assert from 'node:assert/strict';
import test from 'node:test';

import { isAllowedCorsOrigin } from '../dist/lib/security.js';

test('isAllowedCorsOrigin allows configured web origins', () => {
  const webOrigins = ['https://app.example.com', 'https://admin.example.com'];
  
  assert.strictEqual(isAllowedCorsOrigin('https://app.example.com', webOrigins), true);
  assert.strictEqual(isAllowedCorsOrigin('https://admin.example.com', webOrigins), true);
});

test('isAllowedCorsOrigin allows Tauri desktop webview origins', () => {
  const webOrigins = ['https://app.example.com'];
  
  assert.strictEqual(isAllowedCorsOrigin('tauri://localhost', webOrigins), true);
  assert.strictEqual(isAllowedCorsOrigin('https://tauri.localhost', webOrigins), true);
  assert.strictEqual(isAllowedCorsOrigin('http://tauri.localhost', webOrigins), true);
});

test('isAllowedCorsOrigin rejects undefined origin (no Origin header)', () => {
  const webOrigins = ['https://app.example.com'];
  
  assert.strictEqual(isAllowedCorsOrigin(undefined, webOrigins), false);
});

test('isAllowedCorsOrigin rejects null string origin (sandboxed browser contexts)', () => {
  const webOrigins = ['https://app.example.com'];
  
  assert.strictEqual(isAllowedCorsOrigin('null', webOrigins), false);
});

test('isAllowedCorsOrigin rejects empty string origin', () => {
  const webOrigins = ['https://app.example.com'];
  
  assert.strictEqual(isAllowedCorsOrigin('', webOrigins), false);
  assert.strictEqual(isAllowedCorsOrigin('   ', webOrigins), false);
});

test('isAllowedCorsOrigin rejects disallowed origins', () => {
  const webOrigins = ['https://app.example.com'];
  
  assert.strictEqual(isAllowedCorsOrigin('https://evil.com', webOrigins), false);
  assert.strictEqual(isAllowedCorsOrigin('https://app.example.com.evil.com', webOrigins), false);
  assert.strictEqual(isAllowedCorsOrigin('http://app.example.com', webOrigins), false);
});

test('isAllowedCorsOrigin trims whitespace from origin', () => {
  const webOrigins = ['https://app.example.com'];
  
  assert.strictEqual(isAllowedCorsOrigin('  https://app.example.com  ', webOrigins), true);
});

test('isAllowedCorsOrigin with multiple web origins', () => {
  const webOrigins = ['https://app1.com', 'https://app2.com', 'http://localhost:3000'];
  
  assert.strictEqual(isAllowedCorsOrigin('https://app1.com', webOrigins), true);
  assert.strictEqual(isAllowedCorsOrigin('https://app2.com', webOrigins), true);
  assert.strictEqual(isAllowedCorsOrigin('http://localhost:3000', webOrigins), true);
  assert.strictEqual(isAllowedCorsOrigin('https://app3.com', webOrigins), false);
});

test('isAllowedCorsOrigin rejects file protocol origins', () => {
  const webOrigins = ['https://app.example.com'];
  
  assert.strictEqual(isAllowedCorsOrigin('file://', webOrigins), false);
  assert.strictEqual(isAllowedCorsOrigin('file:///path/to/file.html', webOrigins), false);
});

test('isAllowedCorsOrigin rejects data URI origins', () => {
  const webOrigins = ['https://app.example.com'];
  
  assert.strictEqual(isAllowedCorsOrigin('data:text/html,test', webOrigins), false);
});

test('isAllowedCorsOrigin rejects chrome-extension origins', () => {
  const webOrigins = ['https://app.example.com'];
  
  assert.strictEqual(isAllowedCorsOrigin('chrome-extension://abc123', webOrigins), false);
});
