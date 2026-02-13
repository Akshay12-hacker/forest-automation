const fs = require("fs");
const path = require("path");

const STATE_FILE = path.join(__dirname, "../control/state.json");

function readState() {
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

async function waitIfPaused() {
  while (true) {
    const { paused, stop } = readState();

    if (stop) {
      throw new Error("🛑 Automation stopped by UI");
    }

    if (!paused) return;

    await new Promise(r => setTimeout(r, 1000));
  }
}

function setResumePhase(phase) {
  const state = readState();
  state.resume_phase = phase;
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getResumePhase() {
  return readState().resume_phase;
}

function clearResumePhase() {
  const state = readState();
  state.resume_phase = null;
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

module.exports = {
  waitIfPaused,
  getResumePhase,
  clearResumePhase
};
