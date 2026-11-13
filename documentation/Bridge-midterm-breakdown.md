# Bridge: ASL Translation Glove (Midterm Breakdown)

## 1. Overview
Bridge is a wearable glove that translates American Sign Language into text and speech. The goal is to translate signed words and phrases (like "hello", "thank you", "how are you"), not just individual letters.

Fingerspelling the alphabet is the first milestone, and it's what works today. It came first because it's the hardest test of the hand-shape sensing that every sign relies on: 24 of the 26 letters are a single held handshape, so they isolate how well the glove reads the hand. Word-level signs add movement, orientation and often two hands on top of that.

Three parts work together:
- The glove measures finger bends and hand motion.
- A web app connects to it over Bluetooth. It translates, teaches the alphabet, collects training data and tests the recognition model.
- A Raspberry Pi receives the same data and will speak the translated text aloud.

Problem: most hearing people don't know ASL. A glove that turns signs into text or speech lowers that barrier without needing a camera, good lighting, or line of sight.

Roadmap:
| Phase | What it translates | Status |
|---|---|---|
| 1. Static handshapes | The 24 fingerspelled letters that don't move | Working |
| 2. Moving letters | J and Z (handshape + motion) | Motion features built, not evaluated |
| 3. Word and phrase signs | Common signs such as HELLO, THANK YOU, YES, NO | Data collection supports it; recognition not built |
| 4. Sentences, two hands | Sequences of signs; signs that use both hands | Two-hand sensor experiment only |

Live demo: https://bridge-kohl-six.vercel.app

## 2. System architecture
```
┌─────────── GLOVE ───────────┐        ┌──────────────── WEB APP (browser) ─────────────────┐
│ 5 flex sensors (analog)     │        │ Web Bluetooth → SensorContext (shared live state)  │
│ ICM-20948 9-axis IMU (I2C)  │  BLE   │   calibration · bends · smoothing                  │
│ Arduino Nano ESP32          │ ─────► │ Translate · Learn · Glove · Collect · Lab          │
│ 56-byte packet @ ~50 Hz     │        │ Letter model (nearest neighbour, data-driven)      │
└─────────────┬───────────────┘        └───────────────┬────────────────────────────────────┘
              │ BLE                                    │ HTTPS
              ▼                                        ▼
   ┌──── RASPBERRY PI ────┐               ┌──── SUPABASE ────┐      ┌──── VERCEL ────┐
   │ BLE receiver (bleak) │               │ Auth + Postgres  │      │ Hosts the app  │
   │ Piper offline TTS    │               │ team-only dataset│      │ auto-deploys   │
   └──────────────────────┘               └──────────────────┘      └────────────────┘
```

## 3. Hardware
| Component | Role |
|---|---|
| Arduino Nano ESP32 (ESP32-S3) | Microcontroller with built-in Bluetooth Low Energy |
| 5 × flex sensors | One per finger; resistance rises with bend; read as 12-bit analog (0–4095) |
| ICM-20948 9-axis IMU | Accelerometer (mg), gyroscope (°/s), magnetometer (µT): hand orientation and motion |
| Raspberry Pi 4 | Speech-output hub |

Wiring: flex sensors go to A0–A3 (thumb to ring) and D2 (pinky). The IMU uses SDA → A4, SCL → A5, at 3.3 V.

Hardware problems solved:
- ADC noise from the radio: on the ESP32-S3, pins A4–A7 use ADC2, which reads noisy while Bluetooth is on. The pinky was moved to D2, which uses ADC1.
- Long glove wires: I2C runs at 100 kHz instead of 400 kHz and has a 50 ms bus timeout, so a glitch can't freeze the glove.
- Unreliable IMU connection:
  - The firmware tries both IMU addresses (0x68 and 0x69).
  - It marks the sensor as lost after 10 failed reads and retries every 5 s.
  - It keeps sending flex data with the IMU zeroed meanwhile, and the app shows "Motion sensor not responding".
- Toolchain: the firmware must be built with the arduino:esp32 board core; esp32:esp32 makes Bluetooth hang.
- Diagnostic sketches:
  - i2c-pincheck reads the raw I2C line levels to tell a dead sensor from a broken wire.
  - 9-axis-test has a browser visualizer.
  - two-hands tests two IMUs, one per hand, on one bus.

## 4. Firmware and communication protocol
- Sampling: every 20 ms (about 50 Hz), fast enough for quick hand movements.
- Bluetooth: one custom service and one notify characteristic. The connection interval is set to 15–30 ms (15 ms is the minimum macOS and iOS allow).
- Packet: 56 bytes, little-endian: 9 × float32 IMU values, then 5 × int32 raw finger readings.
- Shared format: the web app and the Pi decode the exact same format (<9f5i in Python).

## 5. Web application
Stack: React 18, TypeScript, Vite 6, Tailwind CSS 4, React Router 7, Web Bluetooth API and Supabase. After cleanup it has 9 runtime dependencies, down from 49.

Core design: SensorContext
- Decoding: it decodes every packet and shares it with all pages.
- Render throttling: packets arrive about 50 times a second, but React redraws at most once per screen frame. Code that needs every packet, like the recorder, subscribes to the raw stream instead.
- Calibration is shared app-wide: the user holds an open hand, then a fist. The averaged readings map each finger to 0% (straight) – 100% (bent), which handles different hand sizes and either sensor polarity.
- Simulated glove: a dev-only 50 Hz simulator, so the app can be tested without hardware.

Pages:
| Page | What it does |
|---|---|
| Translate | Live fingerspelling to text. A letter types after being held 0.7 s. Shows confidence, or "Not sure: E or S?" |
| Learn | 26-letter reference, glove practice with per-finger hints ("Bend your index more"), quiz, per-letter progress |
| Glove | Connect, calibrate, live hand diagram, motion-sensor health (facing, roll, pitch) |
| Collect | Labeled recording for research (§7) |
| Lab | Tests and improves the recognition model (§6) |
| Account | Sign-in and progress stats |

## 6. Recognition: how it evolved (phase 1, fingerspelling)
Version 1: hand-written rules.
- Each letter was written as a pattern: each finger straight, bent or half-bent.
- Key finding: flex sensors alone can't distinguish many letters, so only 10 of 26 were recognizable (A B D F I L S U W Y). The lookalikes:
  - E, M, N, S, T are all fists that differ by thumb position.
  - U, V, R, H differ by finger spread, crossing or orientation.
  - G/L/Q and K/P differ by orientation.
  - C/O differ by curvature.
  - J and Z require movement.

Version 2 (current): learned from data.
- Model: a 1-nearest-neighbour classifier. It stores labeled example handshapes (5 calibrated bend values each) and classifies a live hand by its closest example.
- Distance measure: the average difference per finger (RMS), so 0.10 means "each finger off by about 10%".
- Coverage: all 24 static letters are recognized (everything except J and Z).
- Not hard-coded: retraining is instant; adding samples changes the model immediately.

Making it usable in real time:
| Technique | Setting | Why |
|---|---|---|
| Rejection | Reject if the closest letter is > 25% off | A relaxed hand or a transition between letters shouldn't type anything |
| Confidence gate | Say "unsure" if the winner is < 15% closer than the runner-up | Show "E or S?" instead of typing a likely-wrong letter |
| Smoothing | A letter must win 60% of the last 0.3 s | Stops flicker (E→S→E) from sensor noise |
| Hold to type | 0.7 s | Deliberate input |

Robustness results (Lab, random finger noise added to each sample):
| Noise per finger | Result |
|---|---|
| ±5% | ~100% correct |
| ±10%, before the confidence gate | ~95% correct, ~5% wrong letter |
| ±10%, with the confidence gate | 90% right · 7% unsure · 3% wrong |
| ±15% | ~86% correct |

The most confusable pairs: U/V (U read as V up to 28% of the time), E/S/T, T/X and M/E. This matches the finding from Version 1.

Important caveat for the report: the training data is one sample per letter from one person. These numbers measure how far apart the letters are in sensor space, not real-world accuracy on new users.

## 7. Data collection and dataset
Collect page (Krisha). It's already designed for word-level signs, not just letters:
- Free-text labels, so it can record whole signs like HELLO or THANK YOU, not just letters.
- Session setup: a participant ID and left/right hand, then calibration.
- Three sign types: static (1.5 s), moving (2.5 s) and none/rest (2.0 s). Windows are adjustable from 200 ms to 30 s.
- Frame-by-frame capture: every packet, with raw values, bend % and all 9 IMU values.
- Quality checks: warnings for a low sample rate (< 15 Hz) or a missing IMU.
- Storage: autosaves in the browser (IndexedDB).
- Exports: a frame-by-frame CSV with R_ and L_ columns, plus a per-session calibration CSV.

Team dataset (Supabase):
- Each recording uploads automatically to a shared database, and anything missed can be retried.
- Accounts not on the team record into their browser only.

Lab tools:
- Virtual glove: sliders for each finger; load any letter and "wiggle" it to test robustness.
- Live glove input, with the 5 closest letters and their distances.
- Training data editor:
  - Add a sample from the current hand.
  - Import from CSV (both formats), from the Collect page or from the team dataset.
  - Export, or reset to the bundled samples.
- Teach it your hand: a guided recording of all 24 letters plus Rest for 1–3 rounds, showing the target and live hand side by side.
- Robustness test: reports right, unsure and wrong rates per letter, and leave-one-out accuracy once letters have 2 or more samples.
- Motion Lab (on Collect): an experimental k-nearest-neighbours classifier (k = 3) using 14 features. It compares flex-only vs flex + IMU with leave-one-out evaluation, alongside motion rules for J and Z. It's built, but hasn't been evaluated on real data yet.

## 8. Backend, infrastructure and security
There's no separate backend server. The app runs in the browser and uses two hosted services.

Supabase (sign-in and database):
- Email/password login.
- Tables: team_members, recording_sessions and recordings, with frames stored as JSON.
- Row-level security:
  - Logged-out visitors get no access.
  - Only team members can read or upload.
  - People can only change their own rows.
  - Nobody can add themselves to the team.
- Verified with 8 impersonation tests: team member, outsider and logged-out visitor.
- Security cleanup: replaced prototype tables, including one that anyone could edit with the public key.
- Version control: database changes are SQL migrations in the repo (supabase/migrations), and the app's database types are generated from the schema.

Vercel (hosting):
- Connected to GitHub.
- main deploys to production, and every branch or PR gets a preview link.
- Environment variables hold the Supabase settings.
- HTTPS is required for Web Bluetooth, and Vercel provides it.

Engineering practice:
- GitHub Actions type-checks and builds every PR.
- A second action auto-logs commits to COMMIT_LOG.md.
- Feature branches and PRs, plus a README for setup.

## 9. Raspberry Pi (Cake)
- Bluetooth receiver: written in Python with asyncio and bleak. Packets go into a queue tagged with the glove's name, so it's ready for two gloves.
- Speech: offline text-to-speech using Piper (ONNX voice models), resampled to 48 kHz for the speaker. Offline means no internet is needed.
- Updating the Pi:
  - The Pi appears as a USB drive; you copy files onto it.
  - A watcher notices the writes, waits until copying has stopped for 8 s, and checks a hash to see what changed.
  - It then installs the new files and restarts the program.
  - Python packages are pre-downloaded and installed offline.
- Status: speech is working, and Bluetooth reception is being tested on the rasppi-bluetooth branch. Classification on the Pi isn't built yet.

## 10. Timeline
| When | Milestone |
|---|---|
| Feb 2026 | Repo set up; first BLE test between ESP32 and laptop (Python); Figma-generated UI |
| Feb–Mar | 9-axis sensor working; flex sensors over BLE; first calibration UI (PRs #4–#6) |
| Apr | Supabase authentication; sensor integration refactor |
| Sep | Commit-log GitHub Action; 9-axis test tools; ML data-collection page (Krisha); Pi set up with TTS (Cake) |
| Early Oct | Pi Bluetooth receiver; PR #7 merged |
| Oct 16 | Collect rewritten for frame-by-frame recording and IndexedDB (Krisha) |
| Oct 23 | Learned recognition (24 letters), Lab, smoothing and confidence gate, merge, cleanup, Vercel deployment, secure Supabase dataset |

Team: Stuti Pandya, Krisha Veera, William, Gauthier-Balemba, Cake.

## 11. Current status
| Area | Status |
|---|---|
| Glove hardware and firmware | Working |
| BLE → web app | Working, ~50 Hz |
| Calibration | Working |
| Static letter recognition (24) | Working; limited training data |
| Learn / quiz / practice | Working |
| Data collection | Working |
| Lab (testing and training tools) | Working |
| Deployment (Vercel) | Live |
| Secure team dataset (Supabase) | Built and security-tested; end-to-end upload not yet tested |
| Raspberry Pi speech | TTS works; BLE reception in testing |
| Motion features (IMU in the model) | Built (Motion Lab), not evaluated |
| J and Z (moving letters) | Not done |
| Word and phrase signs (the main goal) | Recording supported; recognition not built |
| Multi-person dataset and real accuracy | Not done |
| Two-hand support | Experiment only |

Branch note: today's work is on feature/learned-recognition-lab and not merged into main yet.

## 12. Limitations and risks
- Data: one sample per letter from one person, so accuracy on new users is unknown.
- Sensing limits: flex sensors can't see thumb position or finger spread, so E/S/T/M/N and U/V/R stay hard.
- Browser support: Web Bluetooth works only in Chrome and Edge on desktop.
- Testing: there are no automated unit tests. Testing so far has been manual: the in-browser simulator, the robustness test, and database security tests.
- Calibration drift: recalibrating is needed after re-wearing the glove.
- What a glove can't see: ASL grammar also uses facial expressions, eyebrows, mouth shapes and head movement (for example, to mark a question or negation), plus where the hand is relative to the body. A glove captures hand shape and motion only, so a full translation would eventually need another input such as a camera, or would have to accept that limitation.
- Two hands: many common signs use both hands, but the glove is single-handed for now.

## 13. Next steps (rest of the term)
1. Collect real data: 3–5 people × 24 letters × 5 reps, plus a first set of common word signs (e.g. HELLO, THANK YOU, YES, NO, PLEASE), into the team dataset.
2. Training pipeline:
   - A Python notebook comparing k-NN, random forest, SVM and a small neural network.
   - Leave-one-person-out evaluation (train on everyone but one person, test on them).
   - Export the best model to the web app and the Pi.
3. Use the IMU: test whether orientation features separate G/Q, K/P and H/U, using Motion Lab's flex-only vs flex + IMU comparison.
4. Moving signs: J and Z first, then word signs. Word signs need a model that reads the whole movement over time (e.g. dynamic time warping or a small sequence model such as an LSTM/1D-CNN over the frame recordings), rather than one averaged handshape.
5. Pi end to end: glove → letter → spoken word, with no laptop.
6. Hardware option: a thumb-contact sensor to separate E/S/T/M/N.

Suggested report structure: Introduction (§1) → System design (§2–5) → Recognition method and results (§6) → Data and infrastructure (§7–8) → Pi (§9) → Progress (§10–11) → Limitations (§12) → Plan (§13). The key point to carry through the report: fingerspelling is the first milestone toward full ASL translation. The hand-written rules showed flex sensors alone can't separate some handshapes, the learned model and robustness test measure that limit, and the next steps (real data, the IMU for motion, sequence models for word signs) lead toward translating words and phrases.
