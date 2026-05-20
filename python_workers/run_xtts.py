import argparse
import sys
import json
import time
import os
import gc
import shutil

try:
    import torch
except ImportError:
    torch = None

try:
    from TTS.api import TTS
except ImportError:
    TTS = None
    print("Warning: TTS not installed. Required for real inference.")

def generate_tts(text_json, output_folder, lang, reference_audio):
    """
    Actual Coqui XTTS-v2 orchestration.
    Generates individual wav chunks for each segment to preserve sentence-to-sentence timings later.
    """
    print(f"Loading XTTS-v2 for target language: {lang}")
    device = "cuda" if (torch and torch.cuda.is_available()) else "cpu"
    is_cpu_mode = os.environ.get("CPU_MODE") == "true"
    
    if device == "cuda":
        torch.cuda.empty_cache()
        
    os.makedirs(output_folder, exist_ok=True)
    with open(text_json, "r") as f:
        data = json.load(f)

    if is_cpu_mode or TTS is None:
        print("CPU_MODE is enabled or TTS is missing. Falling back to lightweight TTS (gTTS).")
        try:
            from gtts import gTTS
            has_gtts = True
        except ImportError:
            print("gTTS not installed. Generating silent chunks instead. Tip: pip install gTTS")
            has_gtts = False
            
        import wave
        
        for idx, segment in enumerate(data.get("segments", [])):
            text = segment.get("text", "").strip()
            if not text:
                continue
                
            chunk_path = os.path.join(output_folder, f"chunk_{idx}.wav")
            print(f"Mocking XTTS chunk {idx}: {text}")
            
            success = False
            if has_gtts:
                try:
                    tts_lang = lang[:2].lower() if lang else 'en'
                    # Remove the [Translated to hi] bracket block from being spoken aloud if it exists
                    import re
                    clean_text = re.sub(r'^\[Translated to.*?\]\s*', '', text)
                    if not clean_text:
                         clean_text = "Blank."
                    
                    mp3_path = os.path.join(output_folder, f"chunk_{idx}.mp3")
                    tts = gTTS(clean_text, lang=tts_lang)
                    tts.save(mp3_path)
                    
                    os.system(f'ffmpeg -i "{mp3_path}" -ar 16000 -ac 1 "{chunk_path}" -y -loglevel error')
                    if os.path.exists(mp3_path):
                        os.remove(mp3_path)
                    
                    if os.path.exists(chunk_path):
                        success = True
                except Exception as e:
                    print(f"gTTS fallback failed for chunk {idx}: {e}")
                    
            if not success:
                import urllib.request
                import urllib.parse
                try:
                    tts_lang = lang[:2].lower() if lang else 'en'
                    import re
                    clean_text = re.sub(r'^\[Translated to.*?\]\s*', '', text)
                    if not clean_text or len(clean_text) < 2:
                         clean_text = "Blank."
                    
                    # Google TTS API limits to ~200 characters per request.
                    if len(clean_text) > 180:
                         clean_text = clean_text[:180]
                         
                    safe_text = urllib.parse.quote(clean_text)
                    url = f"http://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q={safe_text}&tl={tts_lang}"
                    
                    mp3_path = os.path.join(output_folder, f"chunk_{idx}.mp3")
                    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
                    with urllib.request.urlopen(req) as response, open(mp3_path, 'wb') as out_file:
                        out_file.write(response.read())
                    
                    os.system(f'ffmpeg -i "{mp3_path}" -ar 16000 -ac 1 "{chunk_path}" -y -loglevel error')
                    if os.path.exists(mp3_path):
                        os.remove(mp3_path)
                    if os.path.exists(chunk_path):
                        success = True
                except Exception as e:
                    print(f"urllib fallback failed for chunk {idx}: {e}")

            if not success:
                # Fallback to silence if network TTS fails
                duration_sec = segment.get("end", 1) - segment.get("start", 0)
                if duration_sec <= 0: duration_sec = 1.0
                num_samples = int(16000 * duration_sec)
                with wave.open(chunk_path, 'w') as wav_file:
                    wav_file.setnchannels(1) # mono
                    wav_file.setsampwidth(2) # 16-bit
                    wav_file.setframerate(16000)
                    wav_file.writeframes(b'\x00' * (num_samples * 2))
        return
    
    # Initialize XTTS
    # We use tts_models/multilingual/multi-dataset/xtts_v2
    try:
        tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)
    except Exception as e:
        print(f"Failed to load TTS model: {e}")
        return
        
    print(f"Using reference audio: {reference_audio} for cloning")
    
    for idx, segment in enumerate(data.get("segments", [])):
        text = segment.get("text", "").strip()
        if not text:
            continue
            
        print(f"Synthesizing XTTS chunk {idx}: {text}")
        chunk_path = os.path.join(output_folder, f"chunk_{idx}.wav")
        
        try:
            # XTTS requires the language to actually be one of its supported (e.g. 'en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'tr', 'ru', 'nl', 'cs', 'ar', 'zh-cn', 'ja', 'hu', 'ko', 'hi')
            tts.tts_to_file(
                text=text,
                speaker_wav=speaker_wav,
                language="en",
                file_path=output_path,
                temperature=0.75,
                speed=1.1
            )
           
        except Exception as e:
            print(f"Failed to synthesize chunk {idx}: {e}")
            
    # Cleanup memory
    del tts
    gc.collect()
    torch.cuda.empty_cache()

    print(f"Saved generated audio chunks to: {output_folder}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--transcript", required=True)
    parser.add_argument("--lang", required=True)
    parser.add_argument("--ref_audio", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    
    generate_tts(args.transcript, args.output, args.lang, args.ref_audio)
