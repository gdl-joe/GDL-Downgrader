'use strict';

const fs = require('node:fs');
const pathMod = require('node:path');

function mapVersionCode(code) {
  if (code >= 43) return code - 18; // 43->25 ... 47->29 ...
  if (code === 41) return 24;
  if (code === 40) return 23;
  if (code === 39) return 22;
  if (code === 38) return 21;
  if (code === 37) return 20;
  if (code === 36) return 19;
  if (code === 35) return 18;
  if (code === 34) return 17;
  if (code === 32) return 16;
  return null;
}

module.exports = { mapVersionCode };
