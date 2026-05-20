import os
import json
import subprocess
from datetime import datetime
from translate_engine import translate_text

INPUT_VIDEO = "test_input/test1.mp4"

AUDIO_PATH = "test_temp/audio.wav"
TRANSCRIPT_PATH = "test_temp/transcript.json"
TRANSLATED_PATH = "test_temp/translated.json"
TTS_AUDIO_PATH = "test_temp/tts_output.wav"
FINAL_OUTPUT = "test_output/final_dubbed.mp4"


def run(cmd, step):
    print(f"\n==================== {step} ====================")
    print("Running:", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"❌ FAILED at {step}")
        print(result.stderr)
        exit(1)

    print(f"✅ SUCCESS: {step}")
    return result.stdout


# STEP 1: Extract audio
def extract_audio():
    run([
        "ffmpeg", "-y",
        "-i", INPUT_VIDEO,
        "-ar", "16000",
        "-ac", "1",
        AUDIO_PATH
    ], "FFMPEG AUDIO EXTRACTION")


# STEP 2: Whisper transcription (using CLI or python fallback)
def transcribe():
    import whisper

    model = whisper.load_model("large-v3")
    result = model.transcribe(AUDIO_PATH)

    with open(TRANSCRIPT_PATH, "w") as f:
        json.dump(result, f, indent=2)

    print("✅ TRANSCRIPTION DONE")


# STEP 3: Fake translation (replace later with NLLB)
def translate():
    with open(TRANSCRIPT_PATH) as f:
        data = json.load(f)

    for seg in data["segments"]:
        seg["translated_text"] = "[TRANSLATED] " + seg["text"]

    with open(TRANSLATED_PATH, "w") as f:
        json.dump(data, f, indent=2)

    print("✅ TRANSLATION DONE (mock)")


# STEP 4: Fake TTS (XTTS later)
def tts():
    from xtts_engine import generate_voice

    # TEMP: we use dummy text for now (translation mock)
    with open(TRANSCRIPT_PATH) as f:
        transcript_data = json.load(f)

    english_text = " ".join(
        [seg["text"] for seg in transcript_data["segments"]]
    
    )

    print("\nTranslating to Hindi...\n")

    text = translate_text(english_text)

    print("\nHindi Translation:\n")
    print(text)

    generate_voice(
        text=text,
        output_path=TTS_AUDIO_PATH,
    )

# STEP 5: Merge video + audio
def merge():
    run([
        "ffmpeg", "-y",
        "-i", INPUT_VIDEO,
        "-i", TTS_AUDIO_PATH,
        "-c:v", "copy",
        "-map", "0:v:0",
        "-map", "1:a:0",
        FINAL_OUTPUT
    ], "FINAL MERGE")


def main():
    print("\n🚀 STARTING SPEECHMAKER PIPELINE TEST")
    print("Time:", datetime.now())

    extract_audio()
    transcribe()
    translate()
    tts()
    merge()

    print("\n🎉 PIPELINE COMPLETE SUCCESSFULLY!")
    print("Output:", FINAL_OUTPUT)


if __name__ == "__main__":
    main()
