#include <Arduino_RouterBridge.h>
#include <Modulino.h>
#include <math.h>

// 1 = normal. 0 = Bridge-only test: no NeoPixel code is built or run, only logs.
#define USE_STRIP 1
#define DEBUG_STATUS 0   // 1 = fall-detection status line every 500 ms; 0 = events only

#if USE_STRIP
#include <Adafruit_NeoPixel.h>
#endif

// --- Calibration knobs ---
#define LED_PIN     A0     // strip data-in pin: check against your wiring
#define NUM_LEDS    30     // TODO: set the real LED count
#define BRIGHTNESS  40     // 0-255; the strip is powered by the board, keep it low
#define FLIP_SIDES  false  // true if the strip's first LED sits on the rider's right
#define WATCHDOG_MS 3000   // no set_state call for this long -> link lost

#if USE_STRIP
Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);
#endif

// =====================================================================
// LED receiver (Pi -> Python -> set_state)
// =====================================================================
const uint8_t LOST = 255;
const uint8_t DEBUG_ALL_RED = 254;  // must match DEBUG in python/main.py
// index = class sent by Python: none, person, bicycle, car, other
const uint32_t COLORS[] = {0x000000, 0x00FF00, 0x0000FF, 0xFF0000, 0xFFFFFF};
const uint32_t LOST_COLOR = 0xFF4000;  // blinking amber: "no data", not "road clear"

volatile uint8_t cls = LOST;
volatile uint8_t side = 0;
volatile uint32_t lastCall = 0;
volatile uint32_t calls = 0;

// Runs in the Bridge thread: only store, never draw or log here
void set_state(int c, int s) {
  cls = c;
  side = s;
  lastCall = millis();
  calls++;
}

uint32_t lastKey = 0xFFFFFFFF;

void ledStep() {
  uint8_t c = cls, s = side;
  if (millis() - lastCall > WATCHDOG_MS) c = LOST;
  bool blink = (c == LOST) && ((millis() / 500) % 2);

  // log on state change (not on blink) and a heartbeat every 5 s
  static uint8_t logC = 0xFD, logS = 0xFD;
  static uint32_t lastBeat = 0;
  if (c != logC || s != logS) {
    logC = c;
    logS = s;
    Monitor.print("state cls=");
    Monitor.print(c);
    Monitor.print(" side=");
    Monitor.println(s);
  }
  if (millis() - lastBeat > 5000) {
    lastBeat = millis();
    Monitor.print("alive calls=");
    Monitor.print((unsigned long)calls);
    Monitor.print(" last_call_ms_ago=");
    Monitor.println((unsigned long)(millis() - lastCall));
  }

#if USE_STRIP
  // show() blocks interrupts: redraw only when the picture changes
  uint32_t key = ((uint32_t)c << 16) | ((uint32_t)s << 8) | blink;
  if (key != lastKey) {
    lastKey = key;
    strip.clear();
    if (c == LOST) {
      if (blink) strip.fill(LOST_COLOR);
    } else if (c == DEBUG_ALL_RED) {
      strip.fill(0xFF0000);  // troubleshooting: Python saw a UDP packet
    } else if (c < sizeof(COLORS) / sizeof(COLORS[0])) {
      if (FLIP_SIDES) s = 2 - s;
      // three (nearly) equal thirds; boundaries rounded so every LED is covered
      uint16_t from = s * NUM_LEDS / 3;
      strip.fill(COLORS[c], from, (s + 1) * NUM_LEDS / 3 - from);
    }
    strip.show();
  }
#endif
}

// =====================================================================
// Fall detection (Modulino Movement) - logic unchanged from fall_alert.ino
// The strip is NOT involved: events go to Python via Bridge.notify("alert").
// =====================================================================
ModulinoMovement imu;

const float TRH_ACC = 0.5f;    // g (4.9 m/s^2 del firmware finale)
const float TRH_ANG = 47.0f;   // gradi: 2*asin(0.4) del firmware finale
const float STILL_G = 0.0816f; // g (0.8 m/s^2 del firmware finale)
const int   N = 20;            // finestra dRMS: ~200 ms a 104 Hz

enum State { NORMAL, IMPACT_ACC, IMPACT_ANG } st = NORMAL;
const char* NAME[] = { "NORMAL", "IMPACT_ACC", "IMPACT_ANG" };

float buf[N], sum, px, py, pz, rx, ry, rz, peak, maxAng, tiltAng;
int idx;
bool first = true, moved, resync;
uint32_t tImpact, tStatus;

static float sq2(float v) { return v * v; }

// Dopo ogni log si azzera il delta del campione successivo (come nel file testato),
// altrimenti un eventuale salto di tempo sembrerebbe un urto.
// Il log va a Python (handler "log"): value in millesimi (3 decimali), ms = millis() della MCU.
static void logEv(const char* msg, float v) {
  Bridge.notify("log", String(msg), (int)(v * 1000), (uint32_t)millis());
  resync = true;
}

// Avviso al Linux della scheda (Python: handler "alert").
//   "IMPACT": prima parte (dRMS sopra soglia). value = dRMS in mg
//   "FALL"  : allarme di caduta.               value = inclinazione in gradi
//   "NOFALL": caduta senza allarme (si e' mossa). value = inclinazione in gradi
static void alertLinux(const char* type, int value) {
  Bridge.notify("alert", String(type), value, (uint32_t)millis());
  resync = true;
}

void fallStep() {
  if (!imu.available()) return;
  imu.update();
  float x = imu.getX(), y = imu.getY(), z = imu.getZ();
  if (first) { px = rx = x; py = ry = y; pz = rz = z; first = false; return; }

  // dRMS come nel firmware finale: sqrt(media(dx^2+dy^2+dz^2) / 3)
  float d2 = resync ? 0 : sq2(x - px) + sq2(y - py) + sq2(z - pz);
  resync = false;
  px = x; py = y; pz = z;
  sum += d2 - buf[idx]; buf[idx] = d2; idx = (idx + 1) % N;
  float drms = sqrtf(fmaxf(sum, 0) / (3 * N));
  if (drms > peak) peak = drms;

  // inclinazione rispetto alla gravita' di riferimento (valida solo se |a| ~ 1 g)
  float n = sqrtf(x*x + y*y + z*z);
  float rn = sqrtf(rx*rx + ry*ry + rz*rz);
  float ang = (n > 0.01f && rn > 0.01f)
      ? acosf(fmaxf(-1, fminf(1, (x*rx + y*ry + z*rz) / (n * rn)))) * 57.29578f : 0;

  uint32_t dt = millis() - tImpact;
  switch (st) {
    case NORMAL:  // riferimento di gravita': media mobile lenta (~5 s)
      rx += 0.002f * (x - rx); ry += 0.002f * (y - ry); rz += 0.002f * (z - rz);
      if (drms > TRH_ACC) {
        logEv("IMPACT drms[g]=", drms);
        st = IMPACT_ACC; tImpact = millis(); maxAng = 0;
        alertLinux("IMPACT", (int)(drms * 1000));          // prima parte
      }
      break;
    case IMPACT_ACC:
      if (fabsf(n - 1) < 0.2f) {  // misura la postura solo se quasi statico
        if (ang > maxAng) maxAng = ang;
        if (ang > TRH_ANG) {
          logEv("TILT ang[deg]=", ang);
          st = IMPACT_ANG; moved = false; tiltAng = ang;
        }
      }
      if (st == IMPACT_ACC && dt > 3000) {  // falso positivo
        logEv("FALSE POSITIVE, max ang[deg]=", maxAng);
        st = NORMAL;
      }
      break;
    case IMPACT_ANG:
      if (dt > 5000 && drms > STILL_G && !moved) {  // finestra 5-10 s
        moved = true;
        logEv("MOVED drms[g]=", drms);
      }
      if (dt > 10000) {
        if (!moved) {
          logEv("ALARM, nessun movimento 5-10 s, dt[ms]=", dt);
          alertLinux("FALL", (int)tiltAng);                 // allarme di caduta
        } else {
          logEv("NO ALARM (si e' mossa), dt[ms]=", dt);
          alertLinux("NOFALL", (int)tiltAng);               // caduta senza allarme
        }
        st = NORMAL;
      }
      break;
  }

#if DEBUG_STATUS
  if (millis() - tStatus >= 500) {
    tStatus = millis();
    char line[80];
    snprintf(line, sizeof line, "%s drms=%.3f peak=%.3f |a|=%.2f ang=%.1f",
             NAME[st], drms, peak, n, ang);
    Bridge.notify("log", String(line), 0, (uint32_t)millis());
    peak = 0; resync = true;
  }
#endif
}

// =====================================================================
void setup() {
  Bridge.begin();
  Monitor.begin(115200);  // after Bridge.begin(): the other order can hang
  Bridge.provide("set_state", set_state);
  Monitor.print("sketch ready, USE_STRIP=");
  Monitor.println(USE_STRIP);
#if USE_STRIP
  strip.begin();
  strip.setBrightness(BRIGHTNESS);
  strip.show();
  Monitor.println("strip initialised");
#endif
  Modulino.begin();
  imu.begin();
  Monitor.println("imu initialised");
}

// One loop, no delay(): the IMU is sampled at ~104 Hz, LEDs redraw only on change.
void loop() {
  fallStep();
  ledStep();
}
