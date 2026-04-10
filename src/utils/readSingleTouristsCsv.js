const fs = require('fs');
const path = require('path');
const projectRoot = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(__dirname, '../..');

function readSingleTouristsCsv() {
  const filePath = path.join(projectRoot, 'src', 'data', 'singleTourist.csv');
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read singleTourist CSV: ${err.message}`);
  }

  if (!raw || !raw.trim()) {
    throw new Error('singleTourist.csv is empty');
  }

  const lines = raw.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('singleTourist.csv must contain headers and at least one row');
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

module.exports = { readSingleTouristsCsv };
