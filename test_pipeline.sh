#!/bin/bash
set -e

INPUT_VIDEO=$1
if [ -z "$INPUT_VIDEO" ]; then
  echo "Usage: ./test_pipeline.sh <input_video.mp4>"
  exit 1
fi

TEMP_DIR="test_temp"
OUTPUT_DIR="test_outputs"
mkdir -p "$TEMP_DIR" "$OUTPUT_DIR"

BASE_NAME=$(basename "$INPUT_VIDEO" | cut -d. -f1)
AUDIO_WAV="$TEMP_DIR/${BASE_NAME}_audio.wav"
TRANSCRIPT="$TEMP_DIR/${BASE_NAME}_transcript.json"
TRANSLATED="$TEMP_DIR/${BASE_NAME}_translated.json"
GEN_FOLDER="$TEMP_DIR/${BASE_NAME}_gen"
ALIGNED="$TEMP_DIR/${BASE_NAME}_aligned.wav"
OUTPUT_MP4="$OUTPUT_DIR/${BASE_NAME}_output.mp4"

echo "1. Extracting audio..."
ffmpeg -i "$INPUT_VIDEO" -q:a 0 -map a -ac 1 -ar 16000 -y "$AUDIO_WAV"

echo "2. Running WhisperX..."
python3 python_workers/run_whisperx.py --audio "$AUDIO_WAV" --output "$TRANSCRIPT" --lang en

echo "3. Placeholder Translation (Copying English to English for test)"
cp "$TRANSCRIPT" "$TRANSLATED"

echo "4. Running XTTS..."
python3 python_workers/run_xtts.py --transcript "$TRANSLATED" --lang en --ref_audio "$AUDIO_WAV" --output "$GEN_FOLDER"

echo "5. Running Pydub..."
python3 python_workers/run_pydub.py --transcript "$TRANSLATED" --gen_folder "$GEN_FOLDER" --output "$ALIGNED"

echo "6. Merging audio..."
ffmpeg -i "$INPUT_VIDEO" -i "$ALIGNED" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -y "$OUTPUT_MP4"

echo "Pipeline test completed!"
echo "Check $OUTPUT_MP4"
