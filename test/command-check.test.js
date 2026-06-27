const { test } = require('node:test');
const assert = require('node:assert');
const { extractCommands, checkCommands } = require('../lib/command-check');

const SAMPLE_XML = `<?xml version="1.0"?>
<Symbol Name="Test">
  <Script_3D><![CDATA[
! this COMMENTONLY token must be ignored
BLOCK 1, 1, 1
text = "this STRINGONLY token must be ignored"
EXTRUDEDSHELL 4, 0
  ]]></Script_3D>
  <Script_2D><![CDATA[
PROJECT2 3, 270, 2
  ]]></Script_2D>
  <ParamSection>BLOCK should not be read from non-script tags ZZZNOISE</ParamSection>
</Symbol>`;

test('extractCommands collects tokens from all script sections (uppercased)', () => {
  const cmds = extractCommands(SAMPLE_XML);
  assert.ok(cmds.has('BLOCK'));
  assert.ok(cmds.has('EXTRUDEDSHELL'));
  assert.ok(cmds.has('PROJECT2'));
});

test('extractCommands ignores comments and string literals', () => {
  const cmds = extractCommands(SAMPLE_XML);
  assert.ok(!cmds.has('COMMENTONLY'));
  assert.ok(!cmds.has('STRINGONLY'));
});

test('extractCommands ignores text outside script sections', () => {
  const cmds = extractCommands(SAMPLE_XML);
  assert.ok(!cmds.has('ZZZNOISE'));
});

test('extractCommands is case-insensitive (GDL keywords)', () => {
  const cmds = extractCommands('<Script_3D><![CDATA[ block 1,1,1\nExtrudedShell 2 ]]></Script_3D>');
  assert.ok(cmds.has('BLOCK'));
  assert.ok(cmds.has('EXTRUDEDSHELL'));
});

test('extractCommands captures GDL variant notation NAME{n}', () => {
  const cmds = extractCommands('<Script_3D><![CDATA[ PROJECT2{4} 3,270,2\nREQUEST{4} "x" ]]></Script_3D>');
  assert.ok(cmds.has('PROJECT2{4}'));
  assert.ok(cmds.has('REQUEST{4}'));
});

test('checkCommands distinguishes a variant from its base command', () => {
  const cmds = new Set(['PROJECT2', 'PROJECT2{4}']);
  const versions = { 'PROJECT2{4}': 20 }; // base PROJECT2 is old, not listed
  const result = checkCommands(cmds, versions, 19);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].command, 'PROJECT2{4}');
});

test('checkCommands flags commands newer than the target version', () => {
  const cmds = new Set(['BLOCK', 'EXTRUDEDSHELL', 'PROJECT2']);
  const versions = { EXTRUDEDSHELL: 27, BLOCK: 1 };
  const result = checkCommands(cmds, versions, 24);
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].command, 'EXTRUDEDSHELL');
  assert.strictEqual(result[0].since, 27);
});

test('checkCommands returns empty when target version covers all commands', () => {
  const cmds = new Set(['EXTRUDEDSHELL']);
  const versions = { EXTRUDEDSHELL: 27 };
  assert.deepStrictEqual(checkCommands(cmds, versions, 27), []);
  assert.deepStrictEqual(checkCommands(cmds, versions, 28), []);
});

test('checkCommands matches case-insensitively against the mapping', () => {
  const cmds = new Set(['EXTRUDEDSHELL']);
  const versions = { extrudedshell: 27 };
  const result = checkCommands(cmds, versions, 24);
  assert.strictEqual(result.length, 1);
});
