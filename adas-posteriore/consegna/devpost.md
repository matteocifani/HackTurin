# Devpost draft (English)

*Bozza scritta sabato 10/10 notte. Le parti tra `[[ ... ]]` sono segnaposto: vanno riempite o cancellate domenica mattina. Niente numero è inventato: quelli che non abbiamo ancora misurato sono segnaposto, quelli da fonti esterne sono marcati "verify".*

---

## Project name
**Guardaspalle** — retrofit rear ADAS for any vehicle that doesn't have one
`[[ nome definitivo? "Guardaspalle" è ancora un nome di lavoro ]]`

## Tagline (max ~200 characters)
A €150 box with a camera, an ultrasonic sensor and on-board AI that watches behind any vehicle — bike, scooter, old car, van, truck, bus — and warns only when it really matters.

## Built with
Raspberry Pi 4 · Arduino UNO Q · Python · OpenCV · Ultralytics YOLO26n / YOLO11n · NCNN · ByteTrack · HC-SR04 · WS2813 LEDs · Modulino Movement · Arduino App Lab · HTML/JS · 3D printing (Bambu P1S)

---

## Inspiration
Danger on the road very often comes from behind, exactly where you can't look.

For cyclists the trend is going the wrong way: `[[ verify: ISTAT 2025 — road deaths down overall, cyclist deaths up 23% (228). Controllare la cifra esatta e la fonte prima di pubblicare ]]`. Bike radars exist, but they beep for every single car that approaches, so after ten minutes riders stop listening. The closest academic prototype to our idea had 8 false alarms out of 10 `[[ verify: Leiden, precision 0.19 — citare la fonte ]]`.

Then a mentor at hackTurin asked us the right question: *why only bikes?* Since July 2024 the EU General Safety Regulation (2019/2144) requires blind-spot and moving-off information systems (UNECE R151/R159) on **new** trucks and buses. Every vehicle already on the road — old cars, delivery vans, trucks, city buses that will keep driving for another 10–15 years — has none of it. London's Direct Vision Standard already forces trucks to retrofit blind-spot sensors to enter the city. So we built one box that adds rear ADAS to whatever vehicle you have, starting with the hardest case: a bicycle.

## What it does
Guardaspalle looks behind the vehicle with AI that runs **entirely on board** (no cloud, no images leave the vehicle). For every road user behind you it estimates:

- **what** it is (car, truck, bus, motorbike, bike, pedestrian);
- **in how many seconds** it will reach you (time-to-collision);
- **on which path** — straight at you, a close pass, or a wide pass;
- **how close** it actually passed, measured by the ultrasonic sensor when it is beside you.

It then combines these into one simple, explainable risk score (vehicle weight × urgency × trajectory) and warns **only when it matters**: amber = light only, red = light + sound.

**Same box, any vehicle.** You pick the vehicle with one parameter (`--mezzo bici | monopattino | auto | furgone | camion | bus`). The perception is identical; only four things change: how wide you are, what counts as a safe passing distance, how much warning time you need, and who weighs most in the risk (on a bike the truck is the threat; on a truck the cyclist in the blind spot is).

**Where the warning goes:**
- **Bike / scooter:** a smart helmet on an Arduino UNO Q — LEDs at the edge of your vision on the side the danger comes from, a beep for red, and a rear light that flashes toward the driver behind you. `[[ confermare cosa funziona dal vivo sul casco: tempie, buzzer, "specchietto che risponde" quando giri la testa, caduta + SOS ]]`
- **Cars, vans, trucks, buses:** an in-cabin unit (same UNO Q firmware) with LEDs on the mirrors and dashboard, plus a live top-down view on any phone or tablet.

**Fail-safe by design.** The AI runs on the Raspberry Pi; the warning hardware runs on a real-time microcontroller. If the camera, the Pi or Wi-Fi fail, the warning unit goes to slow amber within one second instead of silently showing "all clear".

**Privacy by design.** No continuous recording: only short, low-resolution clips of red events are saved on board, together with the event data.

## How we built it
- **Perception (Raspberry Pi 4):** a USB webcam and an HC-SR04 ultrasonic sensor, both facing backwards in one 3D-printed case. Frames are cropped to the road band and fed to **YOLO26n exported to NCNN at 192×480** — a rectangular input that matches the crop, so distant vehicles get 2.25× more pixels at the same cost as 320×320. **ByteTrack** follows each vehicle. We reach about **8 fps on a Pi 4 CPU** `[[ aggiornare con il numero finale ]]`.
- **Calibration-free time-to-collision:** TTC comes from how fast the bounding box grows (slope of ln(width) over time, smoothed with an alpha-beta filter). Lateral distance is measured in "car widths", a pixel ratio that doesn't depend on the camera's optics. That's why the same software works on any vehicle and any webcam.
- **Sensor fusion:** below 40 cm we trust the ultrasonic sensor, above 60 cm the camera, and blend in between. When both see the same vehicle, the system **auto-calibrates** the camera's distance from the ultrasonic readings (in a synthetic test the camera error dropped from 31% to 8%).
- **Risk engine:** only approaching vehicles count (parked cars never trigger anything), per-class weights, per-vehicle profiles, and a 0.7 s hold to avoid flicker.
- **Interfaces:** a built-in web server streams a Tesla-style top-down dashboard and a `/test` page with camera, ultrasonic and fused distance side by side. The UNO Q polls the Pi over HTTP and drives the LEDs and buzzer from its STM32.
- **Tabletop demo:** a toy car at 1:20 scale (`--scale 0.05`) so the jury can see the whole pipeline live on a table.
- The Pi starts everything on boot as a systemd service: no laptop needed.

## Challenges we ran into
- **Night time.** On a real rear-camera night highway video, the default model detected only part of the overtakes, because at night a car is just two headlights. We measured it overtake by overtake and found that YOLO11n plus a cheap gamma correction sees noticeably more than YOLO26n at the same cost. `[[ aggiornare: sorpassi riconosciuti di notte, prima 3/10 → dopo X/10 ]]`
- **Vehicles first seen already beside you** never produced a time-to-collision. `[[ se il fix entra: "now they raise an immediate amber on that side" ]]`
- **Speed on a Pi 4.** Every millisecond mattered: NCNN export, a rectangular input, a capture thread that always drops stale frames, and only 6 classes.
- **Hardware at a hackathon:** a 2 GB USB stick that couldn't hold the OS, a Pi that wouldn't boot with a display attached on a weak power supply, an ultrasonic sensor wired straight to 3.3 V GPIO with no resistors, and brand-new UNO Q APIs to figure out.

## Accomplishments that we're proud of
- **Fewer alarms, the right ones.** On the same night highway video, a radar-style system would have raised **27 alarms; ours raised 9** red warnings `[[ ricontrollare il numero con il modello finale ]]`.
- One codebase that runs on six vehicle profiles with no recalibration.
- A fail-safe architecture borrowed from automotive ADAS, built from hobby parts.
- Camera ↔ ultrasonic fusion that calibrates itself.
- `[[ numero: distanza di sorpasso prevista vs misurata, errore medio ]]`
- `[[ se funziona: lo "specchietto che risponde" sul casco ]]`

## What we learned
- Time-to-collision from box growth is surprisingly robust and needs no calibration at all.
- Choosing the model is a measurement problem, not a leaderboard problem: the "newer" model was worse at night on our data.
- Splitting AI (Pi) from safety-critical output (microcontroller) makes failures predictable.
- A good mentor question ("why only bikes?") can turn a gadget into a platform.

## What's next
- **Side blind-spot mode for trucks and buses**, where the typical fatal crash is a cyclist or pedestrian on a right turn.
- **A city sensor network for Turin:** every red event becomes an anonymous point (place, time, vehicle type, passing distance). If the city's buses carried Guardaspalle, Turin would see which junctions produce near-misses long before someone dies. Open data, compatible with OpenBikeSensor.
- Night and range: headlight-pair detection, mmWave radar fusion.
- Driver drowsiness/distraction monitoring with the UNO Q camera — the other system the EU requires on new vehicles only.
- A single board with an AI accelerator and a 12–24 V vehicle power input.

## Cost comparison (optional section)
| | Commercial retrofit (Mobileye 8 Connect, truck BSIS kits) | Bike radar (Garmin Varia) | Guardaspalle |
|---|---|---|---|
| Cost | `[[ verify: hundreds to thousands of € installed ]]` | `[[ verify: ~€200 ]]` | ~€100–150 in hobby parts `[[ verify con il BOM ]]` |
| Understands what's coming | partly | no, beeps for everything | yes: class, distance, time-to-collision |
| Data for the city | none or proprietary | none | open and anonymous |

## Links
- Code: https://github.com/matteocifani/HackTurin (folder `adas-posteriore/`)
- Video: `[[ link YouTube/Vimeo ]]`

## Honest limits (good to keep, the jury appreciates it)
It's a driving aid, not a certified safety system, and it doesn't replace mirrors. On motor vehicles it's been tested on real footage and at scale, not yet on a real truck: a real truck needs more cameras, starting with the right side. Night detection and rain are declared limits we're working on.
