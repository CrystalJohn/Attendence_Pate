import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import process from 'node:process';
import Module, { createRequire } from 'node:module';

// Exercise the actual TypeScript renderer, not a parallel copy of its logic.
const compiled = await build({
  stdin: { contents: `
    import { createElement } from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { Mascot } from './src/components/Mascot';
    export { isMascotId, MASCOT_IDS, MASCOT_STATES } from './src/domain/mascotIds';
    export const render = (items) => renderToStaticMarkup(createElement('div', null,
      ...items.map(([id,state], key) => createElement(Mascot, {id,state,key}))));
  `, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', packages: 'external',
  define: {'process.env.NODE_ENV': '"production"'},
});
const fixture = new Module(import.meta.url);
fixture.require = createRequire(import.meta.url);
fixture._compile(compiled.outputFiles[0].text, 'mascot-fixture.cjs');
const { render, MASCOT_IDS, MASCOT_STATES, isMascotId } = fixture.exports;

test('all 30 canonical combinations render and use isolated SVG resources', () => {
  // Include identical instances to catch shared leaf/glow IDs from the original source.
  const combinations = MASCOT_IDS.flatMap(id => MASCOT_STATES.map(state => [id,state]));
  const html = render([...combinations, ['pip','idle'], ['spark','idle']]);
  assert.equal((html.match(/<svg /g) ?? []).length, 32);
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of html.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(match[1]), `missing SVG resource ${match[1]}`);
  assert.ok(html.includes('mascot-still'));
});

test('unknown and legacy identifiers are not accepted as new mascot choices', () => {
  for (const id of MASCOT_IDS) assert.equal(isMascotId(id), true);
  for (const id of ['panda','fox','Pip','',null,undefined,'unknown']) assert.equal(isMascotId(id), false);
});
