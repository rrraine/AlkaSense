# scripts/watcher.py
# Watches upload_queue/ for new images and triggers training.

import time, yaml, subprocess, logging
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

with open("config/alkasense_config.yaml") as f:
    cfg = yaml.safe_load(f)

logging.basicConfig(
    filename=cfg["logging"]["system_log"],
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

MIN_NEW = cfg["triggers"]["min_new_samples_to_trigger"]
QUEUE   = cfg["dataset"]["upload_queue_dir"]
pending_count = 0


class UploadHandler(FileSystemEventHandler):
    def on_created(self, event):
        global pending_count
        if event.is_directory:
            return
        ext = Path(event.src_path).suffix.lower()
        if ext in {".jpg", ".jpeg", ".png"}:
            pending_count += 1
            logging.info(f"New upload detected: {event.src_path} ({pending_count} pending)")
            if pending_count >= MIN_NEW:
                pending_count = 0
                logging.info("Threshold reached — starting auto-train pipeline.")
                subprocess.Popen(["python", "scripts/prepare_dataset.py"])
                subprocess.Popen(["python", "scripts/train.py"])
                subprocess.Popen(["python", "scripts/export_tflite.py"])


if __name__ == "__main__":
    observer = Observer()
    observer.schedule(UploadHandler(), path=QUEUE, recursive=False)
    observer.start()
    logging.info(f"File watcher started on: {QUEUE}")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()