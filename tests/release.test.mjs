// Release hygiene: the plugin manifests, the README badge and the changelog agree on the version,
// so a release never ships half-bumped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { REPO, SKILL, readJson } from './helpers.mjs';

const plugin = readJson(path.join(REPO, 'plugin.json'));
const read = (p) => fs.readFileSync(path.join(REPO, p), 'utf8');

test('the plugin version is a semantic version', () => {
  assert.match(plugin.version, /^\d+\.\d+\.\d+$/);
});

test('plugin.json points at the skill, logo, and native Antigravity subagents', () => {
  assert.equal(plugin.name, 'floorplan');
  assert.ok(fs.existsSync(path.join(REPO, plugin.logo)), `logo: ${plugin.logo}`);
  assert.ok(fs.existsSync(path.join(REPO, 'skills', plugin.name, 'SKILL.md')));
  for (const a of ['floorplan-analyst.md', 'floorplan-describer.md']) {
    assert.ok(fs.existsSync(path.join(REPO, 'agents', a)), `agents/${a}`);
  }
});

test('the README version badge matches plugin.json', () => {
  assert.match(read('README.md'), new RegExp(`badge/version-${plugin.version.replaceAll('.', '\\.')}-`));
});

test('the changelog has an entry for this version', () => {
  assert.match(read('CHANGELOG.md'), new RegExp(`^## ${plugin.version.replaceAll('.', '\\.')} \\(\\d{4}-\\d{2}-\\d{2}\\)$`, 'm'));
});

test('the skill has a name and description, and every file it points to exists', () => {
  const skill = fs.readFileSync(path.join(SKILL, 'SKILL.md'), 'utf8');
  assert.match(skill, /^---\r?\nname: floorplan\r?\ndescription:[\s\S]{50,}?\r?\n---/);
  for (const [, ref] of skill.matchAll(/\]\((references\/[\w.-]+\.md)/g)) assert.ok(fs.existsSync(path.join(SKILL, ref)), ref);
  for (const [, script] of skill.matchAll(/scripts\/(\w+\.mjs)/g)) assert.ok(fs.existsSync(path.join(SKILL, 'scripts', script)), script);
});

test('CHECKSUMS.txt is for this version, so each release ships its fingerprints', () => {
  assert.match(read('CHECKSUMS.txt'), new RegExp(`^# Floorplan ${plugin.version.replaceAll('.', '\\.')}:`), 'run node tools/checksums.mjs when bumping the version');
});
