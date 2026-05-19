import argparse
import json
import os

try:
    from pydub import AudioSegment
    from pydub.silence import split_on_silence
except ImportError:
    AudioSegment = None
    print("Warning: pydub not installed. Required for real inference.")

def align_audio(original_transcript_json, generated_audio_folder, output_audio):
    """
    Actual pydub alignment logic.
    Aligns XTTS-generated sentences into the original video timestamps.
    """
    print(f"Loading generated audio segments from {generated_audio_folder}")
    print("Aligning to original transcription timestamps...")
    
    with open(original_transcript_json, "r") as f:
        data = json.load(f)
        
    if AudioSegment is None:
        print("ERROR: pydub is not installed. Using native wave fallback for alignment...")
        import wave
        
        output_wav = wave.open(output_audio, 'w')
        output_wav.setnchannels(1)
        output_wav.setsampwidth(2)
        output_wav.setframerate(16000)
        
        current_time_sec = 0.0
        
        target_total_sec = data.get("segments", [])[-1].get("end", 0) if data.get("segments") else 0
        if target_total_sec == 0:
            output_wav.writeframes(b'\x00' * (16000 * 2 * 1))
            output_wav.close()
            return
            
        for idx, segment in enumerate(data.get("segments", [])):
            original_start = segment["start"]
            original_end = segment["end"]
            
            # Pad silence for gap
            if original_start > current_time_sec:
                silence_dur = original_start - current_time_sec
                silence_samples = int(16000 * silence_dur)
                output_wav.writeframes(b'\x00' * (silence_samples * 2))
                current_time_sec = original_start
                
            chunk_path = os.path.join(generated_audio_folder, f"chunk_{idx}.wav")
            actual_duration = 0
            if os.path.exists(chunk_path):
                # read wav and append
                try:
                    with wave.open(chunk_path, 'r') as cw:
                        frames = cw.readframes(cw.getnframes())
                        output_wav.writeframes(frames)
                        actual_duration = cw.getnframes() / cw.getframerate()
                except Exception as e:
                    print(f"Error reading chunk {idx}: {e}")
            
            current_time_sec += actual_duration
            
            if current_time_sec < original_end:
                 # pad up to end
                 pad_dur = original_end - current_time_sec
                 pad_samples = int(16000 * pad_dur)
                 output_wav.writeframes(b'\x00' * (pad_samples * 2))
                 current_time_sec = original_end

        output_wav.close()
        print(f"Exporting merged aligned logic track to: {output_audio}")
        return

    final_audio = AudioSegment.silent(duration=0)
    current_time_ms = 0
    
    for idx, segment in enumerate(data.get("segments", [])):
        original_start_ms = int(segment["start"] * 1000)
        original_end_ms = int(segment["end"] * 1000)
        target_duration_ms = original_end_ms - original_start_ms
        
        # Pad silence if there's a gap before this segment
        if original_start_ms > current_time_ms:
            final_audio += AudioSegment.silent(duration=(original_start_ms - current_time_ms))
            current_time_ms = original_start_ms
        
        chunk_path = os.path.join(generated_audio_folder, f"chunk_{idx}.wav")
        if not os.path.exists(chunk_path):
            print(f"Warning: Chunk {idx} not found. Skipping.")
            continue
            
        chunk_audio = AudioSegment.from_wav(chunk_path)
        actual_duration_ms = len(chunk_audio)
        
        # Simplistic Alignment:
        # If generated audio is much longer, we can speed it up (requires pydub speedup, or ffmpeg fallback).
        # For MVP stability without complex pitch-shifting, if it's longer, we just let it push the timeline,
        # OR we truncate. We'll let it push, but cut padding to prevent massive drift.
        # Ideally, we time-stretch without pitch shift.
        # Standard approach:
        # 1. If it's shorter, append silence to respect the original end boundary.
        # 2. If it's longer, just append it (might cause desync in extreme cases).
        
        final_audio += chunk_audio
        current_time_ms += actual_duration_ms
        
        # If we finished before the original end, pad up to original end
        if current_time_ms < original_end_ms:
            final_audio += AudioSegment.silent(duration=(original_end_ms - current_time_ms))
            current_time_ms = original_end_ms
            
    print(f"Exporting merged aligned audio track to: {output_audio}")
    final_audio.export(output_audio, format="wav")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--transcript", required=True)
    parser.add_argument("--gen_folder", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    
    align_audio(args.transcript, args.gen_folder, args.output)
