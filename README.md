# Bridge

A sensor glove that turns American Sign Language fingerspelling into text, plus a web app to translate, learn the alphabet, and collect training data.

## How it works

```
Glove (Arduino Nano ESP32)                     Web app (browser)                Raspberry Pi
5 flex sensors + ICM-20948 IMU  ── BLE ──►  translate · learn · collect   (in progress: speaks
56-byte packets at ~50 Hz                   letter model, calibration      recognized text)
```

- **Glove firmware** (`ESP32/esp32`) streams five finger bends and 9-axis motion over Bluetooth Low Energy.
- **Web app** (`frontend`) connects with Web Bluetooth, calibrates to the wearer's hand, and recognizes letters with a nearest-neighbour model trained on recorded samples. Supabase handles sign-in.
- **Raspberry Pi** (`RaspPi`) receives the same packets and speaks text with offline text-to-speech (Piper).

## Web app

| Page | What it does |
|---|---|
| Translate | Live fingerspelling to text; holds a letter for 0.7 s to type it |
| Learn | Alphabet reference, practice with live per-finger hints, quiz |
| Glove | Connect, calibrate, and check every sensor |
| Collect | Record labeled samples frame by frame and export CSV |
| Lab | Test the model with a virtual or real glove, edit training data, measure robustness |

### Run locally

Needs Node 20+ and Chrome or Edge (Web Bluetooth).

```sh
cd frontend
cp .env.example .env   # add the Supabase URL and publishable key
npm install
npm run dev
```

`npm run check` type-checks; `npm run build` produces `frontend/dist`.

### Deploy

Hosted on Vercel with `frontend` as the project root. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` in the Vercel project. There is no separate backend.

## Firmware

Open `ESP32/esp32/esp32.ino` in the Arduino IDE with the **Arduino ESP32 Boards** core (`arduino:esp32`) and the `ArduinoBLE` and `SparkFun 9DoF IMU Breakout - ICM 20948` libraries. Wiring is documented at the top of the sketch. `ESP32/i2c-pincheck` and `ESP32/9-axis-test` help debug the motion sensor.

## Team

Stuti Pandya, Krisha Veera, William, Gauthier-Balemba, and Cake.
