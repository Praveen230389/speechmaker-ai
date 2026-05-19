import argparse
import json
import os

parser = argparse.ArgumentParser()

parser.add_argument("--transcript", required=True)
parser.add_argument("--output", required=True)
parser.add_argument("--src_lang", required=True)
parser.add_argument("--tgt_lang", required=True)

args = parser.parse_args()

print("MOCK NLLB TRANSLATION STARTED")

with open(args.transcript, "r") as f:
    data = json.load(f)

# mock translation
for segment in data.get("segments", []):
    original = segment.get("text", "")
    segment["translated_text"] = f"[HI] {original}"

os.makedirs(os.path.dirname(args.output), exist_ok=True)

with open(args.output, "w") as f:
    json.dump(data, f, indent=2)

print(f"Mock translation saved to: {args.output}")
