import os
import json
import subprocess
from datetime import datetime

import whisper

from translate_engine import translate_text
from xtts_engine import generate_voice


INPUT_VIDEO = "test_input/test1.mp4"

TEMP_DIR = "test_temp"
OUTPUT_DIR = "test_output"

AUDIO_PATH = f"{TEMP_DIR}/audio.wav"
TRANSCRIPT_PATH = f"{TEMP_DIR}/transcript.json"

FINAL_AUDIO = f"{TEMP_DIR}/final_combined.wav"
FINAL_VIDEO = f"{OUTPUT_DIR}/final_hindi_dubbed.mp4"


def run_command(command, step_name):
    print(f"\n==================== {step_name} ====================")
    print("Running:", " ".join(command))

    result = subprocess.run(command)

    if result.returncode != 0:
        raise Exception(f"FAILED: {step_name}")

    print(f"✅ SUCCESS: {step_name}")


def extract_audio():
    command = [
        "ffmpeg",
        "-y",
        "-i",
        INPUT_VIDEO,
        "-ar",
        "16000",
        "-ac",
        "1",
        AUDIO_PATH
    ]

    run_command(command, "FFMPEG AUDIO EXTRACTION")


def transcribe():
    print("\n==================== TRANSCRIPTION ====================")

    model = whisper.load_model("large-v3")

    result = model.transcribe(AUDIO_PATH)

    with open(TRANSCRIPT_PATH, "w") as f:
        json.dump(result, f, indent=2)

    print("✅ TRANSCRIPTION COMPLETE")


def generate_segments():
    print("\n==================== SEGMENT TTS ====================")

    with open(TRANSCRIPT_PATH, "r") as f:
        transcript = json.load(f)

    segment_files = []

    for i, seg in enumerate(transcript["segments"]):

        english_text = seg["text"].strip()

        if not english_text:
            continue

        print(f"\n--- Segment {i} ---")
        print("English:", english_text)

        hindi_text = translate_text(english_text)

        print("Hindi:", hindi_text)

        segment_output = f"{TEMP_DIR}/segment_{i}.wav"

        generate_voice(
            text=hindi_text,
            output_path=segment_output
        )

        segment_files.append(segment_output)

    return segment_files


def combine_audio(segment_files):

    print("\n==================== COMBINING AUDIO ====================")

    concat_file = f"{TEMP_DIR}/concat.txt"

    with open(concat_file, "w") as f:
        for seg in segment_files:
            f.write(f"file '{os.path.abspath(seg)}'\n")

    command = [
        "ffmpeg",
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concat_file,
        "-c",
        "copy",
        FINAL_AUDIO
    ]

    run_command(command, "AUDIO CONCAT")


def merge_video():

    command = [
        "ffmpeg",
        "-y",
        "-i",
        INPUT_VIDEO,
        "-i",
        FINAL_AUDIO,
        "-c:v",
        "copy",
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        FINAL_VIDEO
    ]

    run_command(command, "FINAL VIDEO MERGE")


def main():

    print("\n🚀 STARTING SEGMENT-BASED HINDI DUBBING PIPELINE")
    print("Time:", datetime.now())

    extract_audio()

    transcribe()

    segment_files = generate_segments()

    combine_audio(segment_files)

    merge_video()

    print("\n🎉 COMPLETE!")
    print("Output:", FINAL_VIDEO)


if __name__ == "__main__":
    main()
