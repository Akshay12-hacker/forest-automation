const xlsx = require('xlsx');
const path = require('path');
const projectRoot = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(__dirname, '../..');

function readTourists() {
  const filePath = path.join(projectRoot, 'src', 'data', 'tourists.xlsx');
  const wb = xlsx.readFile(filePath);
  const sheet = wb.Sheets['tourists'];
  if (!sheet) throw new Error('❌ tourists sheet missing');

  const data = xlsx.utils.sheet_to_json(sheet);
  if (data.length === 0) throw new Error('❌ No tourist data found');

  return data;
}

module.exports = { readTourists };
