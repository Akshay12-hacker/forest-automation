const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { log } = require('./logger');

const projectRoot = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(__dirname, '../..');

const permitsLogPath = path.join(projectRoot, 'logs', 'permits.jsonl');
const licensePath = path.join(projectRoot, 'config', 'license.key');

function readLicenseHash() {
  try {
    const licenseKey = fs.readFileSync(licensePath, 'utf8').trim();
    if (!licenseKey) return null;
    return crypto.createHash('sha256').update(licenseKey).digest('hex');
  } catch {
    return null;
  }
}

function postJson(urlString, payload, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const body = JSON.stringify(payload);
    const transport = url.protocol === 'https:' ? https : http;

    const req = transport.request(
      {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...(process.env.FOREST_TELEMETRY_API_KEY
            ? { Authorization: `Bearer ${process.env.FOREST_TELEMETRY_API_KEY}` }
            : {}),
        },
        timeout: timeoutMs,
      },
      (res) => {
        res.resume();
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`Telemetry server returned HTTP ${res.statusCode}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('Telemetry request timed out'));
    });
    req.write(body);
    req.end();
  });
}

async function recordPermitCompleted(details) {
  const event = {
    event: 'permit_completed',
    occurredAt: new Date().toISOString(),
    licenseHash: readLicenseHash(),
    appVersion: process.env.FOREST_APP_VERSION || 'dev',
    machineId: process.env.FOREST_MACHINE_ID || null,
    details,
  };

  try {
    fs.mkdirSync(path.dirname(permitsLogPath), { recursive: true });
    fs.appendFileSync(permitsLogPath, `${JSON.stringify(event)}\n`);
  } catch (error) {
    log(`Could not write local permit telemetry: ${error.message}`);
  }

  const endpoint = process.env.FOREST_TELEMETRY_URL;
  if (!endpoint) {
    return;
  }

  try {
    await postJson(endpoint, event);
    log('Permit completion reported to telemetry server');
  } catch (error) {
    log(`Telemetry server report failed: ${error.message}`);
  }
}

module.exports = { recordPermitCompleted };
