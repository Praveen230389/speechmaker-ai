#!/bin/bash
set -e

echo "Generating a 5-second test video with simple audio tone..."
ffmpeg -f lavfi -i testsrc=duration=5:size=1280x720:rate=30 \
       -f lavfi -i sine=frequency=440:duration=5 \
       -c:v libx264 -c:a aac -pix_fmt yuv420p sample_video.mp4

echo "Generated sample_video.mp4"
