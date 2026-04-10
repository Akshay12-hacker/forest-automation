const fs = require('fs');
const path = require('path');
const projectRoot = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(__dirname, '../..');

function readTouristsCsv() {
  const filePath = path.join(projectRoot, 'src', 'data', 'tourists.csv');
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read tourists CSV: ${err.message}`);
  }

  if (!raw || !raw.trim()) {
    throw new Error('tourists.csv is empty');
  }

  const lines = raw.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('tourists.csv must contain headers and at least one row');
  }
  const headers = lines.shift().split(',');

  return lines.map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = values[i]?.trim();
    });
    return obj;
  });
}

module.exports = { readTouristsCsv };
