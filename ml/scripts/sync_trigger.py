# scripts/sync_trigger.py
# Polls for internet connectivity; triggers training when back online
# and new data has been staged.

import time, yaml, requests, subprocess, logging
from pathlib import Path

with open("config/alkasense_config.yaml") as f:
    cfg = yaml.safe_load(f)

logging.basicConfig(
    filename=cfg["logging"]["system_log"],
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

CHECK_URL      = cfg["triggers"]["connectivity_check_url"]
CHECK_INTERVAL = cfg["triggers"]["connectivity_check_interval_sec"]
QUEUE          = cfg["dataset"]["upload_queue_dir"]
MIN_NEW        = cfg["triggers"]["min_new_samples_to_trigger"]
was_offline    = False


def is_online() -> bool:
    try:
        requests.get(CHECK_URL, timeout=5)
        return True
    except requests.ConnectionError:
        return False


def queue_has_new_data() -> bool:
    queue_files = list(Path(QUEUE).glob("*.jpg")) + \
                  list(Path(QUEUE).glob("*.jpeg")) + \
                  list(Path(QUEUE).glob("*.png"))
    return len(queue_files) >= MIN_NEW


if __name__ == "__main__":
    logging.info("Connectivity watcher started.")
    while True:
        online = is_online()

        if was_offline and online:
            logging.info("Connection restored.")
            if queue_has_new_data():
                logging.info("New data found in queue — triggering auto-train pipeline.")
                subprocess.Popen(["python", "scripts/prepare_dataset.py"])
                subprocess.Popen(["python", "scripts/train.py"])
                subprocess.Popen(["python", "scripts/export_tflite.py"])
            else:
                logging.info("Back online but no new data in queue — skipping retrain.")

        was_offline = not online
        time.sleep(CHECK_INTERVAL)