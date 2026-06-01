import os
import glob
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
uploads_dir = os.path.join(BASE_DIR, "uploads")

print("Files in uploads folder:")
for f in glob.glob(os.path.join(uploads_dir, "*")):
    print(os.path.basename(f), os.path.getsize(f), "bytes")
