const fs = require('fs');
const path = require('path');

function readTouristsCsv() {
  const filePath = path.join(__dirname, '../data/tourists.csv');
  const raw = fs.readFileSync(filePath, 'utf8');

  const lines = raw.trim().split('\n');
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
