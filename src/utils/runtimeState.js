const state = {
  paused: false,
  stopped: false,
  resumeFrom: null
};

module.exports = {
  state,
  pause() {
    state.paused = true;
  },
  resume(phase) {
    state.paused = false;
    state.resumeFrom = phase;
  },
  stop() {
    state.stopped = true;
  },
  shouldPause() {
    return state.paused;
  },
  shouldStop() {
    return state.stopped;
  }
};
