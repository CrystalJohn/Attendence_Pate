import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import process from 'node:process';
import Module, { createRequire } from 'node:module';

const compiled = await build({
  stdin: { contents: "export { createUuid } from './src/domain/ids';", resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
});
const fixture = new Module(import.meta.url);
fixture.require = createRequire(import.meta.url);
fixture._compile(compiled.outputFiles[0].text, 'ids-fixture.cjs');
const { createUuid } = fixture.exports;

test('uses secure randomUUID when the browser exposes it', () => {
  assert.equal(createUuid({ randomUUID: () => 'secure-id' }), 'secure-id');
});

test('creates a valid v4 UUID through getRandomValues when randomUUID is unavailable', () => {
  const uuid = createUuid({ getRandomValues: (bytes) => {
    bytes.fill(0xff);
    return bytes;
  } });
  assert.match(uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('fails clearly when no cryptographic random source is available', () => {
  assert.throws(() => createUuid({}), /Secure random number generation is unavailable/);
});
