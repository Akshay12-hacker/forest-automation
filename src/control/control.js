function readResumePhase() {
  const state = readState();
  return state.resume_phase;
}

function clearResumePhase() {
  const state = readState();
  state.resume_phase = null;
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

module.exports = { readState, waitIfPaused, readResumePhase, clearResumePhase };
