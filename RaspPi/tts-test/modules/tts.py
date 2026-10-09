import os, time
from piper.voice import PiperVoice
import sounddevice as sd
import numpy as np
from scipy.signal import resample_poly

# Get file directory
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model_dir = os.path.join(root_dir, "tts-model")

# Find the model
piper_model_path = None
for filename in os.listdir(model_dir):
    if filename.endswith(".onnx"):
        piper_model_path = os.path.join(model_dir, filename)

# Load the model and get the sample rate
voice = PiperVoice.load(piper_model_path)
piper_sample_rate = voice.config.sample_rate

# The speaker's supported sample rate
output_sample_rate = 48000

def wait_for_audio_device(device):
    loaded = False
    while loaded == False:
        try:
            sd.check_output_settings(device=device, channels=1, samplerate=48000, dtype="int16")
            print("Audio device ready")
            loaded = True
            return
        except:
            print(f"Waiting for device {device}...")
            time.sleep(0.5)

# Plays TTS as audio
def play(text):
    with sd.OutputStream(samplerate=output_sample_rate, channels=1, dtype="int16") as stream:
        for chunk in voice.synthesize(text):
            audio = np.frombuffer(chunk.audio_int16_bytes, dtype=np.int16)

            # Convert piper's sample rate to 48 kHz and convert back into an int16 array
            audio_48k = resample_poly(audio, output_sample_rate, piper_sample_rate)
            audio_48k = np.clip(audio_48k, -32768, 32767).astype(np.int16)

            # Write to the audio output stream
            stream.write(audio_48k)
