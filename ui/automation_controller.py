import subprocess
import threading
import os
from ui.state_helper import set_state

PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)

node_process = None

def start_automation(log):
    global node_process

    set_state(paused=False, stop=False, resume_phase=None)

    if node_process is not None:
        log("⚠ Automation already running")
        return

    node_process = subprocess.Popen(
        ["node", "src/index.js"],
        cwd=PROJECT_ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    threading.Thread(target=read_stdout, args=(log,), daemon=True).start()
    threading.Thread(target=read_stderr, args=(log,), daemon=True).start()

def pause_automation(log):
    set_state(paused=True)
    log("⏸ Pause signal sent")

def resume_automation(log):
    set_state(paused=False)
    log("▶ Resume signal sent")

def stop_automation(log):
    global node_process
    set_state(stop=True, paused=False)

    if node_process:
        node_process.terminate()
        node_process = None

    log("⏹ Node process terminated")

def read_stdout(log):
    for line in node_process.stdout:
        log("[NODE] " + line.strip())

def read_stderr(log):
    for line in node_process.stderr:
        log("[ERR] " + line.strip())
