import os
import subprocess
import threading

from security.machine_lock import get_machine_id
from ui.state_helper import app_path, resource_path, set_state


PROJECT_ROOT = app_path()
RESOURCE_ROOT = resource_path()

node_process = None


def start_automation(log):
    global node_process

    set_state(paused=False, stop=False, resume_phase=None)

    if node_process is not None:
        log("Automation already running")
        return

    node_path = resource_path("node", "node.exe")
    entry_script = resource_path("src", "index.js")

    if not os.path.exists(node_path):
        log(f"Node runtime not found: {node_path}")
        return

    if not os.path.exists(entry_script):
        log(f"Automation entry script not found: {entry_script}")
        return

    env = os.environ.copy()
    env["PROJECT_ROOT"] = PROJECT_ROOT
    env["RESOURCE_ROOT"] = RESOURCE_ROOT
    env["FOREST_MACHINE_ID"] = get_machine_id()

    try:
        node_process = subprocess.Popen(
            [node_path, entry_script],
            cwd=RESOURCE_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env,
        )
    except Exception as exc:
        log(f"Failed to start Node: {exc}")
        return

    threading.Thread(target=read_stdout, args=(node_process, log), daemon=True).start()
    threading.Thread(target=read_stderr, args=(node_process, log), daemon=True).start()
    threading.Thread(target=monitor_process_exit, args=(node_process, log), daemon=True).start()

    log("Automation started")


def pause_automation(log):
    set_state(paused=True)
    log("Pause signal sent")


def resume_automation(log):
    set_state(paused=False)
    log("Resume signal sent")


def stop_automation(log):
    global node_process

    set_state(stop=True, paused=False)

    if node_process:
        try:
            node_process.terminate()
        except Exception:
            pass
        node_process = None

    log("Automation stopped")


def read_stdout(process, log):
    try:
        if process.stdout is None:
            return
        for line in process.stdout:
            log("[NODE] " + line.strip())
    except Exception:
        log("Node stdout closed")


def read_stderr(process, log):
    try:
        if process.stderr is None:
            return
        for line in process.stderr:
            log("[ERR] " + line.strip())
    except Exception:
        log("Node stderr closed")


def monitor_process_exit(process, log):
    global node_process
    try:
        code = process.wait()
        if node_process is process:
            node_process = None
        log(f"Automation process exited with code {code}")
    except Exception as exc:
        log(f"Failed to monitor automation process: {exc}")
