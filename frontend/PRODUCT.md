# PRODUCT.md — Bridge

Facts only. Sources: `.bunshin/harvest/facts.md` (repo root). Anything not here is unknown and must stay generic on the page.

## Platform
Web: a single-page app (React 18 + TypeScript, Vite 6, Tailwind CSS 4, React Router 7), deployed on Vercel. Talks to the glove with Web Bluetooth, which works in Chrome and Edge on desktop only. Sign-in and the team dataset use Supabase.

## Stack
`frontend/` — React 18, TypeScript, Vite 6, Tailwind 4, GSAP + ScrollTrigger (approved for the redesign), lucide-react icons, @radix-ui/react-dialog. No other UI library.

## Users
1. **Landing page:** graders and demo-day visitors of a university capstone (CEG 4913, University of Ottawa, Fall 2026). They give the page under a minute and need to understand what the glove does, how it works, what works today, and what is next.
2. **The app:** the six-person team and testers, wearing the glove: translating, learning the alphabet, calibrating, collecting labelled data, testing the model.

## Product purpose
Bridge is a wearable sensor glove that translates American Sign Language into text and speech. Fingerspelling the static letters works today; translating word and phrase signs is the goal.

## Positioning
A student-built, honest working prototype. It shows real sensor data and real progress, and it is open about what is not done yet. It does not claim to replace interpreters or to "fix" communication for Deaf people.

## Operating context
- Landing: a laptop on a demo table or a grader's own screen; sometimes a phone.
- App: a desktop Chrome window next to a person wearing the glove; live data at about 50 Hz.

## Capabilities (true today)
- Glove: 5 flex sensors (one per finger) + 9-axis motion sensor + Arduino Nano ESP32, streaming over Bluetooth at about 50 Hz. One glove built; second in November 2026.
- Translate: recognises the 24 static ASL letters (not J, Z) with a data-driven nearest-neighbour model; shows "unsure" when two letters are too close; hold 0.7 s to type.
- Learn: alphabet with hand diagrams, glove practice with per-finger hints, quiz, progress.
- Glove page: connect, calibrate (open hand, then fist), live hand diagram, motion sensor status.
- Collect: frame-by-frame recordings, CSV export, upload to a team-only dataset.
- Lab: virtual glove sliders, top-5 closest signs, training data editing, guided personal recording, robustness test.
- Raspberry Pi body unit: receives glove data over Bluetooth; speaks text offline (Piper TTS). Sign classifier on the Pi: November 2026.

## Constraints
- No photographs or video of the glove exist yet. Use drawn hands and live sensor visuals; never stock photos of gloves or hands presented as Bridge.
- No real-world accuracy figure exists. The only number: robustness test at ±10% simulated finger noise, one sample per letter from one person: 90% right, 7% unsure, 3% wrong. Always labelled as a simulation.
- Word/phrase translation is not built. Never imply it works today.
- No testimonials, partners, press, prices, battery life or weight figures.
- The app pages require sign-in (Supabase). Data pages must keep working exactly as they do now: this is a visual redesign, not a feature change.

## Brand commitments
- Name: Bridge. App tagline: "Bridging communication through sign language."
- Mood chosen by the team: human and warm (hands, people and conversation first; soft, friendly, light).
- Existing mark: a hand icon in a rounded square. No logo file beyond it.

## Evidence on hand
Working app (https://bridge-kohl-six.vercel.app), firmware, the system diagram, the midterm report text, the robustness test, the 8/8 database security tests, a latency budget (≈0.35 s to show a sign, ≈1.05 s to type it, against a 5–10 s requirement).

## Product principles
1. Show the hand. The hand and its live data are the hero, drawn, not photographed.
2. Honest about progress: every claim is true today, or clearly marked as next.
3. Signing is a language, not a puzzle: respectful wording about ASL and Deaf people.
4. The app is a tool used while wearing a glove: big, glanceable state; no decoration that competes with live data.

## Accessibility and inclusion
WCAG AA contrast; full keyboard paths; visible focus; `prefers-reduced-motion` respected everywhere (GSAP timelines degrade to instant or fade); live regions for recognised letters; no information carried by motion or colour alone. Team: Gauthier Balemba, Aidan Brin, Somana Debnath, William Mallette, Stuti Pandya, Krisha Veera.
