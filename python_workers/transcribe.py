import whisper
import sys
import json
import os

audio_file = sys.argv[1]
output_file = sys.argv[2] if len(sys.argv) > 2 else None

model = whisper.load_model("base")

result = model.transcribe(audio_file)

if output_file:
    with open(output_file, "w") as f:
        json.dump(result, f, indent=2)
else:
    print(json.dumps(result, indent=2))
