#!/usr/bin/env python3
"""
Watches the USB mass-storage backing image for changes via inotify (no
polling), then mirrors its contents into /opt/payload and (re)launches
main.py once writes go quiet.
"""
import hashlib
import os
import shutil
import subprocess
import sys

from inotify_simple import INotify, flags

IMAGE = "/piusb/piusb.bin"
MOUNT_POINT = "/mnt/piusb_ro"
PAYLOAD_DIR = "/opt/payload"
STATE_FILE = "/opt/usb-watcher/last_hash.txt"

QUIET_MS = 8000            # no writes for this long => treat transfer as done
MAX_QUIET_WAIT_MS = 120000 # give up waiting for quiet after this long and sync anyway

running_proc = None        # subprocess.Popen handle for main.py, if launched

PAYLOAD_PYTHON = "/opt/payload-venv/bin/python3"


def sha256_of_file(path, chunk_size=4 * 1024 * 1024):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(chunk_size):
            h.update(chunk)
    return h.hexdigest()


def load_last_hash():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return f.read().strip()
    return None


def save_last_hash(h):
    with open(STATE_FILE, "w") as f:
        f.write(h)


def wait_for_quiet(inotify):
    """Block on the inotify fd; return once QUIET_MS passes with no new events,
    or once MAX_QUIET_WAIT_MS total has elapsed (whichever comes first)."""
    waited_ms = 0
    while True:
        events = inotify.read(timeout=QUIET_MS)
        if not events:
            return  # no events arrived within QUIET_MS => settled
        waited_ms += QUIET_MS
        if waited_ms >= MAX_QUIET_WAIT_MS:
            print(f"wait_for_quiet: gave up after {waited_ms}ms, syncing anyway.")
            return


def kill_python_processes():
    """Kill any previously running main.py process cleanly."""
    global running_proc
    
    # If we have a direct handle on the process we spawned, terminate it safely
    if running_proc is not None:
        try:
            running_proc.terminate()
            running_proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            running_proc.kill()
        except ProcessLookupError:
            pass
        running_proc = None
        return

    # Fallback: Only kill other instances explicitly running main.py
    out = subprocess.run(
        ["pgrep", "-f", "main.py"], capture_output=True, text=True
    ).stdout.split()
    
    my_pid = os.getpid()
    for pid_str in out:
        pid = int(pid_str)
        if pid == my_pid:
            continue
        try:
            os.kill(pid, 15)  # SIGTERM
        except ProcessLookupError:
            pass



def mount_image_ro():
    subprocess.run(
        ["mount", "-o", "loop,ro", IMAGE, MOUNT_POINT], check=True, timeout=30
    )


def unmount_image():
    subprocess.run(["umount", MOUNT_POINT], check=False, timeout=30)


def sync_payload():
    shutil.rmtree(PAYLOAD_DIR, ignore_errors=True)
    shutil.copytree(MOUNT_POINT, PAYLOAD_DIR)


def launch_main_if_present():
    global running_proc

    main_path = os.path.join(PAYLOAD_DIR, "main.py")
    if not os.path.isfile(main_path):
        print("No main.py found in payload; nothing to launch.")
        return

    env = os.environ.copy()
    env["PYTHONUNBUFFERED"] = "1"

    # Use the persistent venv when available. Fall back to the Python
    # interpreter running this watcher if the venv is not present.
    python_bin = (
        PAYLOAD_PYTHON
        if os.path.isfile(PAYLOAD_PYTHON)
        else sys.executable
    )

    # main.py inherits the watcher's stdin/stdout/stderr.
    running_proc = subprocess.Popen(
        [python_bin, "-u", "main.py"],
        cwd=PAYLOAD_DIR,
        env=env,
        stdout=sys.stdout,  # Redirect stdout to systemd journal
        stderr=sys.stderr   # Redirect errors to systemd journal
    )


    print(f"Launched main.py (pid {running_proc.pid}) via {python_bin}")


def process_update():
    new_hash = sha256_of_file(IMAGE)
    if new_hash == load_last_hash():
        print("Hash unchanged after settle; skipping.")
        return

    print("Change detected, syncing...")
    kill_python_processes()
    mount_image_ro()
    try:
        sync_payload()
    finally:
        unmount_image()

    save_last_hash(new_hash)
    launch_main_if_present()


def main():
    print("USB watcher started.")

    print("Launching main.py...")
    launch_main_if_present()

    # Handle content that was already sitting in PISHARE before we ever started
    # (e.g. Pi rebooted, or the watcher was restarted after files were copied).
    print("Checking for pre-existing content...")
    try:
        process_update()
    except Exception:
        import traceback
        traceback.print_exc()
        print("Startup sync failed; continuing to watch for changes anyway.")

    inotify = INotify()
    inotify.add_watch(IMAGE, flags.MODIFY)

    print("Waiting for changes (event-driven, no polling)...")
    while True:
        events = inotify.read()   # blocks indefinitely until a write happens
        if events:
            try:
                wait_for_quiet(inotify)
                process_update()
            except Exception:
                import traceback
                traceback.print_exc()
                print(
                    "Sync failed; watcher is still running and will retry "
                    "on next change."
                )


if __name__ == "__main__":
    main()