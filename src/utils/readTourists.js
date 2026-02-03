const xlsx = require('xlsx');

function readTourists() {
  const wb = xlsx.readFile('data/tourists.xlsx');
  const sheet = wb.Sheets['tourists'];
  if (!sheet) throw new Error('❌ tourists sheet missing');

  const data = xlsx.utils.sheet_to_json(sheet);
  if (data.length === 0) throw new Error('❌ No tourist data found');

  return data;
}

module.exports = { readTourists };
