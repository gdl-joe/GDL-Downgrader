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

const { scanConverters, findConverter } = require('../lib/converters');

function makeMacConverterTree() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'graphisoft-'));
  // base/AC29/Archicad 29.app/Contents/MacOS/LP_XMLConverter.app/Contents/MacOS/LP_XMLConverter
  const conv = path.join(base, 'AC29', 'Archicad 29.app', 'Contents', 'MacOS',
    'LP_XMLConverter.app', 'Contents', 'MacOS');
  fs.mkdirSync(conv, { recursive: true });
  fs.writeFileSync(path.join(conv, 'LP_XMLConverter'), '');
  const conv24 = path.join(base, 'AC24', 'Archicad 24.app', 'Contents', 'MacOS',
    'LP_XMLConverter.app', 'Contents', 'MacOS');
  fs.mkdirSync(conv24, { recursive: true });
  fs.writeFileSync(path.join(conv24, 'LP_XMLConverter'), '');
  return base;
}

test('scanConverters finds mac converters sorted descending', () => {
  const base = makeMacConverterTree();
  const result = scanConverters('darwin', [base]);
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].version, 29);
  assert.strictEqual(result[1].version, 24);
  assert.ok(result[0].path.endsWith('LP_XMLConverter'));
});

test('findConverter returns the converter for a given version', () => {
  const base = makeMacConverterTree();
  const list = scanConverters('darwin', [base]);
  assert.strictEqual(findConverter(list, 24).version, 24);
  assert.strictEqual(findConverter(list, 99), null);
});

test('scanConverters returns empty array when base dir missing', () => {
  assert.deepStrictEqual(scanConverters('darwin', ['/nonexistent/xyz']), []);
});

const { maxConverterVersion, findDecompileConverter } = require('../lib/converters');

const DC_LIST = [
  { version: 25, path: '/c/25', name: 'AC25' },
  { version: 27, path: '/c/27', name: 'AC27' },
  { version: 29, path: '/c/29', name: 'AC29' }
];

test('maxConverterVersion returns the highest installed version', () => {
  assert.strictEqual(maxConverterVersion(DC_LIST), 29);
  assert.strictEqual(maxConverterVersion([]), null);
});

test('findDecompileConverter picks the lowest converter >= source version', () => {
  assert.strictEqual(findDecompileConverter(DC_LIST, 21).version, 25); // AC21 object read by AC25
  assert.strictEqual(findDecompileConverter(DC_LIST, 27).version, 27); // exact
  assert.strictEqual(findDecompileConverter(DC_LIST, 29).version, 29);
});

test('findDecompileConverter returns null when object is newer than all converters', () => {
  assert.strictEqual(findDecompileConverter(DC_LIST, 30), null);
});

test('findDecompileConverter uses the highest converter for unknown source version', () => {
  assert.strictEqual(findDecompileConverter(DC_LIST, null).version, 29);
});
