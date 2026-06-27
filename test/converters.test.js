const { test } = require('node:test');
const assert = require('node:assert');
const { mapVersionCode } = require('../lib/converters');

test('mapVersionCode maps modern codes (>=43) to AC version', () => {
  assert.strictEqual(mapVersionCode(43), 25);
  assert.strictEqual(mapVersionCode(46), 28);
  assert.strictEqual(mapVersionCode(47), 29);
});

test('mapVersionCode maps legacy codes', () => {
  assert.strictEqual(mapVersionCode(41), 24);
  assert.strictEqual(mapVersionCode(40), 23);
  assert.strictEqual(mapVersionCode(32), 16);
});

test('mapVersionCode returns null for unknown codes', () => {
  assert.strictEqual(mapVersionCode(0), null);
  assert.strictEqual(mapVersionCode(33), null);
});

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { detectGsmVersion } = require('../lib/converters');

function writeFakeGsm(versionByte) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-fixture-'));
  const file = path.join(dir, 'test.gsm');
  // GSM-Header: Byte 0/1 = 'm''m' (0x6d) Magic, Byte 2 = Versionscode
  const buf = Buffer.from([0x6d, 0x6d, versionByte, 0x00, 0, 0, 0, 0]);
  fs.writeFileSync(file, buf);
  return file;
}

test('detectGsmVersion reads AC29 (code 47) from header', () => {
  const file = writeFakeGsm(47);
  assert.strictEqual(detectGsmVersion(file), 29);
});

test('detectGsmVersion reads AC24 (code 41) from header', () => {
  const file = writeFakeGsm(41);
  assert.strictEqual(detectGsmVersion(file), 24);
});

test('detectGsmVersion returns null for non-GSM magic', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-bad-'));
  const file = path.join(dir, 'bad.gsm');
  fs.writeFileSync(file, Buffer.from([0x00, 0x00, 47, 0, 0, 0, 0, 0]));
  assert.strictEqual(detectGsmVersion(file), null);
});
