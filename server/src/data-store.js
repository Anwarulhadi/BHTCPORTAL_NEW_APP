const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function filePath(name) {
  return path.join(dataDir, `${name}.json`);
}

function readJson(name, defaultValue) {
  const p = filePath(name);
  if (!fs.existsSync(p)) return defaultValue;
  try {
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw || 'null') || defaultValue;
  } catch (err) {
    console.error('readJson error', name, err);
    return defaultValue;
  }
}

function writeJson(name, data) {
  const p = filePath(name);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  readJson,
  writeJson,
};
