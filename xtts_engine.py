import torch
import os
from TTS.api import TTS

# FORCE NON-INTERACTIVE MODE
os.environ["COQUI_TOS_AGREED"] = "1"

device = "cuda" if torch.cuda.is_available() else "cpu"

print("Loading XTTS model on:", device)

# load model once
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=True)


def generate_voice(text, output_path):
    print("Generating voice...")

    tts.tts_to_file(
        text=text,
        file_path=output_path,
        speaker="Ana Florence",
        language="hi",
        speed=1.0
    )

    print("Voice generated:", output_path)
