import subprocess
import threading
import os
import sys
from ui.state_helper import set_state

# Detect root folder (works for EXE and dev)
if getattr(sys, "frozen", False):
    PROJECT_ROOT = os.path.dirname(sys.executable)
else:
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

    # Use bundled node
    node_path = os.path.join(PROJECT_ROOT, "node", "node.exe")

    if not os.path.exists(node_path):
        log("❌ Node runtime not found")
        return

    env = os.environ.copy()
    env["PROJECT_ROOT"] = PROJECT_ROOT

    # Let Playwright use its default browser cache location.
    # Forcing a custom path requires bundling browser binaries there.

    try:
        node_process = subprocess.Popen(
            [node_path, os.path.join(PROJECT_ROOT, "src", "index.js")],
            cwd=PROJECT_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env
        )
    except Exception as e:
        log(f"❌ Failed to start Node: {e}")
        return

    threading.Thread(
        target=read_stdout,
        args=(node_process, log),
        daemon=True
    ).start()

    threading.Thread(
        target=read_stderr,
        args=(node_process, log),
        daemon=True
    ).start()

    threading.Thread(
        target=monitor_process_exit,
        args=(node_process, log),
        daemon=True
    ).start()

    log("▶ Automation started")


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
        try:
            node_process.terminate()
        except Exception:
            pass

        node_process = None

    log("⏹ Automation stopped")


def read_stdout(process, log):
    try:
        if process.stdout is None:
            return
        for line in process.stdout:
            log("[NODE] " + line.strip())
    except Exception:
        log("⚠ Node stdout closed")


def read_stderr(process, log):
    try:
        if process.stderr is None:
            return
        for line in process.stderr:
            log("[ERR] " + line.strip())
    except Exception:
        log("⚠ Node stderr closed")


def monitor_process_exit(process, log):
    global node_process
    try:
        code = process.wait()
        if node_process is process:
            node_process = None
        log(f"ℹ Automation process exited with code {code}")
    except Exception as e:
        log(f"⚠ Failed to monitor automation process: {e}")