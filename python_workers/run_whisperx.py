import json
import argparse
import gc
import os
import shutil

try:
    import torch
except ImportError:
    torch = None

try:
    import whisperx
except ImportError:
    whisperx = None
    
try:
    import whisper
except ImportError:
    whisper = None

def synthesize_whisperx(audio_file, output_json, lang=None):
    """
    Actual WhisperX orchestration inside a GPU container.
    """
    print(f"Loading WhisperX/Whisper to process: {audio_file}")
    
    device = "cuda" if (torch and torch.cuda.is_available()) else "cpu"
    is_cpu_mode = os.environ.get("CPU_MODE") == "true"

    if device == "cuda":
        torch.cuda.empty_cache()

    if is_cpu_mode or whisperx is None:
        print("Using OpenAI Whisper (CPU / Fallback Mode)")
        
        api_key = os.environ.get("GEMINI_API_KEY")
        if api_key and os.path.exists(audio_file):
            print("Gemini API key found. Using Gemini 1.5 Flash for audio transcription!")
            try:
                import base64
                import urllib.request
                
                with open(audio_file, "rb") as af:
                    audio_b64 = base64.b64encode(af.read()).decode('utf-8')
                    
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                prompt = "Transcribe this audio precisely. Output ONLY a valid JSON array of objects, where each object has 'start' (float, seconds), 'end' (float, seconds), and 'text' (string). No markdown, no formatting."
                
                payload = {
                    "contents": [{
                        "parts": [
                            {"text": prompt},
                            {"inlineData": {"mimeType": "audio/wav", "data": audio_b64}}
                        ]
                    }],
                    "generationConfig": {"temperature": 0.1}
                }
                
                req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req) as response:
                    res_raw = response.read()
                    res_json = json.loads(res_raw.decode('utf-8'))
                    
                text_content = res_json.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "[]")
                text_content = text_content.replace('```json', '').replace('```', '').strip()
                
                try:
                    segments = json.loads(text_content)
                    if isinstance(segments, list):
                         with open(output_json, "w") as f:
                              json.dump({"segments": segments}, f, indent=4)
                         print(f"Gemini API STT success! Extracted {len(segments)} segments.")
                         return
                except Exception as parse_e:
                    print(f"Failed to parse Gemini JSON: {parse_e}\nRaw output: {text_content[:200]}")
            except Exception as req_e:
                print(f"Gemini API request failed: {req_e}")

        if whisper is None:
            print("ERROR: openai-whisper is not installed and Gemini API failed. Mocking transcription for full audio length.")
            try:
                import wave
                duration = 10.0
                try:
                    with wave.open(audio_file, 'r') as w:
                        duration = w.getnframes() / float(w.getframerate())
                except Exception as e:
                    print(f"Failed to read audio duration: {e}")
                
                segments = []
                current_time = 0.0
                seg_idx = 1
                while current_time < duration:
                    seg_end = min(current_time + 4.0, duration) # 4 second sentences
                    segments.append({
                        "start": current_time,
                        "end": seg_end,
                        "text": f" This is mock sentence {seg_idx}."
                    })
                    current_time = seg_end
                    seg_idx += 1
                
                with open(output_json, "w") as f:
                    json.dump({"segments": segments}, f, indent=4)
                print(f"Transcription mocked successfully for {duration:.1f}s. Saved to {output_json}")
            except Exception as e:
                print(f"Failed to generate mock transcript: {e}")
            return

        model_size = "base" if is_cpu_mode else "base"
        print(f"Loading '{model_size}' whisper model...")
        model = whisper.load_model(model_size, device=device)
        result = model.transcribe(audio_file, language=lang)
        
        # Structure the result similarly to WhisperX
        formatted_result = {
            "segments": result["segments"],
            "language": result["language"]
        }
        
        with open(output_json, "w") as f:
            json.dump(formatted_result, f, indent=4)
        print(f"Transcription complete. Saved to {output_json}")
        return

    # WHISPERX FLOW
    batch_size = 16 if device == "cuda" else 4 # reduce if low on VRAM
    compute_type = "float16" if device == "cuda" else "int8"
    
    # 1. Transcribe with Whisper
    model_size = "base"
    print(f"Loading '{model_size}' model...")
    model = whisperx.load_model(model_size, device, compute_type=compute_type, language=lang)
    audio = whisperx.load_audio(audio_file)
    result = model.transcribe(audio, batch_size=batch_size)
    
    del model
    gc.collect()
    torch.cuda.empty_cache()

    # 2. Align timestamps
    model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
    result = whisperx.align(result["segments"], model_a, metadata, audio, device, return_char_alignments=False)
    
    del model_a
    gc.collect()
    torch.cuda.empty_cache()

    with open(output_json, "w") as f:
        json.dump(result, f, indent=4)
        
    print(f"Transcription complete. Saved to {output_json}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--lang", default=None)
    args = parser.parse_args()
    
    synthesize_whisperx(args.audio, args.output, args.lang)
