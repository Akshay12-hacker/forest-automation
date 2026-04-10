const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const projectRoot = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(__dirname, "../..");

// ⭐ SINGLE SOURCE OF TRUTH
const STATE_FILE = path.join(projectRoot, "config", "state.json");
const AUDIT_LOG_FILE = path.join(projectRoot, "logs", "security_audit.log");
const DEFAULT_STATE = { paused: false, stop: false, resume_phase: null };
const ALLOWED_RESUME_PHASES = new Set([null, "PHASE_7", "PHASE_8_FULL", "PHASE_8_SINGLE"]);
const STATE_SECRET = process.env.FOREST_STATE_SECRET || "forest_state_dev_secret";
const DEFAULT_SECRET_IN_USE = STATE_SECRET === "forest_state_dev_secret";
let defaultSecretWarned = false;

function audit(event, detail) {
  try {
    const line = `[${new Date().toISOString()}] ${event}: ${detail}\n`;
    fs.mkdirSync(path.dirname(AUDIT_LOG_FILE), { recursive: true });
    fs.appendFileSync(AUDIT_LOG_FILE, line, "utf8");
  } catch {
    // Do not crash if audit logging fails.
  }
}

function ensureStateFile() {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (DEFAULT_SECRET_IN_USE && !defaultSecretWarned) {
    audit("STATE_SECRET_DEFAULT", "FOREST_STATE_SECRET not set; using default development secret.");
    defaultSecretWarned = true;
  }
  if (!fs.existsSync(STATE_FILE)) {
    writeState(DEFAULT_STATE);
  }
  try {
    fs.accessSync(STATE_FILE, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    audit("STATE_FILE_ACCESS", `State file not readable/writable: ${STATE_FILE}`);
  }
}

function sanitizeState(input) {
  const raw = input && typeof input === "object" ? input : {};
  const resume = ALLOWED_RESUME_PHASES.has(raw.resume_phase) ? raw.resume_phase : null;
  return {
    paused: Boolean(raw.paused),
    stop: Boolean(raw.stop),
    resume_phase: resume,
  };
}

function signState(state) {
  const payload = JSON.stringify({
    paused: state.paused,
    stop: state.stop,
    resume_phase: state.resume_phase,
  });
  return crypto.createHmac("sha256", STATE_SECRET).update(payload).digest("hex");
}

function writeState(next) {
  const safe = sanitizeState(next);
  const data = { ...safe, signature: signState(safe) };
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), "utf8");
}

function readState() {
  ensureStateFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    const safe = sanitizeState(parsed);
    if (typeof parsed.signature !== "string") {
      return DEFAULT_STATE;
    }
    const expected = signState(safe);
    const given = Buffer.from(parsed.signature);
    const target = Buffer.from(expected);
    if (given.length !== target.length || !crypto.timingSafeEqual(given, target)) {
      audit("STATE_TAMPER_DETECTED", "Invalid or mismatched state signature.");
      return DEFAULT_STATE;
    }
    return safe;
  } catch {
    audit("STATE_READ_ERROR", "Failed to read/parse state file; using safe default.");
    return DEFAULT_STATE;
  }
}

async function waitIfPaused() {
  while (true) {

    const { paused, stop } = readState();

    if (stop) {
      throw new Error("🛑 Automation stopped by UI");
    }

    if (!paused) return;

    console.log("[CONTROL] ⏸ Paused by UI...");
    await new Promise(r => setTimeout(r, 1000));
  }
}

function setResumePhase(phase) {
  ensureStateFile();
  const s = readState();
  s.resume_phase = phase;
  writeState(s);
}

function getResumePhase() {
  return readState().resume_phase;
}

function clearResumePhase() {
  ensureStateFile();
  const s = readState();
  s.resume_phase = null;
  writeState(s);
}

module.exports = {
  waitIfPaused,
  setResumePhase,
  getResumePhase,
  clearResumePhase
};
