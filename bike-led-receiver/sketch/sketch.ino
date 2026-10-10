#include <Arduino_RouterBridge.h>
#include <Adafruit_NeoPixel.h>

// --- Calibration knobs ---
#define LED_PIN     A0     // strip data-in pin: check against your wiring
#define NUM_LEDS    30     // TODO: set the real LED count
#define BRIGHTNESS  40     // 0-255; the strip is powered by the board, keep it low
#define FLIP_SIDES  false  // true if the strip's first LED sits on the rider's right
#define WATCHDOG_MS 3000   // no set_state call for this long -> link lost

Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

const uint8_t LOST = 255;
// index = class sent by Python: none, person, bicycle, car, other
const uint32_t COLORS[] = {0x000000, 0x00FF00, 0x0000FF, 0xFF0000, 0xFFFFFF};
const uint32_t LOST_COLOR = 0xFF4000;  // blinking amber: "no data", not "road clear"

volatile uint8_t cls = LOST;
volatile uint8_t side = 0;
volatile uint32_t lastCall = 0;

// Runs in the Bridge thread: only store, never draw here
void set_state(int c, int s) {
  cls = c;
  side = s;
  lastCall = millis();
}

void setup() {
  Bridge.begin();
  Bridge.provide("set_state", set_state);
  strip.begin();
  strip.setBrightness(BRIGHTNESS);
  strip.show();
}

uint32_t lastKey = 0xFFFFFFFF;

void loop() {
  uint8_t c = cls, s = side;
  if (millis() - lastCall > WATCHDOG_MS) c = LOST;
  bool blink = (c == LOST) && ((millis() / 500) % 2);

  // show() blocks interrupts: redraw only when the picture changes
  uint32_t key = ((uint32_t)c << 16) | ((uint32_t)s << 8) | blink;
  if (key != lastKey) {
    lastKey = key;
    strip.clear();
    if (c == LOST) {
      if (blink) strip.fill(LOST_COLOR);
    } else if (c < sizeof(COLORS) / sizeof(COLORS[0])) {
      if (FLIP_SIDES) s = 2 - s;
      // three (nearly) equal thirds; boundaries rounded so every LED is covered
      uint16_t first = s * NUM_LEDS / 3;
      strip.fill(COLORS[c], first, (s + 1) * NUM_LEDS / 3 - first);
    }
    strip.show();
  }
  delay(20);
}
