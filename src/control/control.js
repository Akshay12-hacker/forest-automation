const fs = require("fs");
const path = require("path");

// ⭐ SINGLE SOURCE OF TRUTH
const STATE_FILE = path.join(__dirname, "../../config/state.json");

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { paused: false, stop: false, resume_phase: null };
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
  const s = readState();
  s.resume_phase = phase;
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

function getResumePhase() {
  return readState().resume_phase;
}

function clearResumePhase() {
  const s = readState();
  s.resume_phase = null;
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

module.exports = {
  waitIfPaused,
  setResumePhase,
  getResumePhase,
  clearResumePhase
};
