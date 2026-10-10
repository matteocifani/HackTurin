#include <Arduino_RouterBridge.h>

// 1 = normal. 0 = Bridge-only test: no NeoPixel code is built or run, only logs.
#define USE_STRIP 1

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
}

uint32_t lastKey = 0xFFFFFFFF;

void loop() {
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
      uint16_t first = s * NUM_LEDS / 3;
      strip.fill(COLORS[c], first, (s + 1) * NUM_LEDS / 3 - first);
    }
    strip.show();
  }
#endif
  delay(20);
}
