// Guardaspalle - bici, setup senza portatile (Arduino UNO Q, lato STM32).
//
// La UNO Q è il cervello sulla bici: il lato Linux fa girare bike_adas.py (camera + YOLO)
// e python/main.py, che passa il rischio a questo sketch.
// Qui gira tutto quello che deve funzionare SEMPRE, anche se l'AI si blocca:
//  - HC-SR04 a sinistra: distanza reale di sorpasso, e avviso anche senza camera;
//  - una strip WS2813 lungo il tubo orizzontale: i primi 3 LED sul manubrio
//    (SINISTRA / DIETRO / DESTRA, in visione periferica), gli ultimi come luce posteriore;
//  - buzzer: suona solo per il rosso;
//  - Modulino Movement sul telaio: "la bici sa cosa stai per fare" (inizi a spostarti
//    a sinistra mentre arriva qualcosa -> rosso + bip subito) e caduta della bici -> SOS;
//  - watchdog: niente dati dall'AI da 1 s -> LED ambra lenti, l'ultrasuono continua.
//
// DA VERIFICARE in App Lab: Bridge.provide_safe (altrimenti Bridge.provide), tone() sul
// core Zephyr (altrimenti USE_TONE 0), assi della Modulino (YAW_AXIS, LEFT_SIGN, UP_AXIS).

#include <Arduino_RouterBridge.h>
#include <Adafruit_NeoPixel.h>  // >= 1.15.5 (FastLED non compila sulla UNO Q)
#include <Modulino.h>

#define USE_TONE 1

// ---------------------------------------------------------------- collegamenti
const int PIN_STRIP = 6;   // dati WS2813; 5V e GND dalla UNO Q
const int PIN_BUZZER = 5;  // buzzer passivo Grove (sul manubrio)
const int PIN_BUTTON = 2;  // pulsante "sto bene" verso GND (sul manubrio)
const int PIN_TRIG = 7;    // HC-SR04: VCC al 5V, ECHO diretto (pin tolleranti a 5 V, tranne D3)
const int PIN_ECHO = 8;

// ---------------------------------------------------------------- strip
const int NUM_LEDS = 30;
const int HUD_FIRST = 0;     // 3 LED sul manubrio: HUD_FIRST = sinistra, +1 dietro, +2 destra
const int REAR_LEDS = 10;    // ultimi LED della strip, sotto la sella, verso l'automobilista
const uint8_t HUD_MAX = 120; // luminosità del manubrio: visibile di giorno, non abbagliante

// ---------------------------------------------------------------- soglie
const unsigned long LINK_TIMEOUT_MS = 1000;
const long NEAR_RED_CM = 150, NEAR_AMBER_CM = 250;
const char YAW_AXIS = 'Z';          // asse verticale del giroscopio con la Modulino sul telaio
const float LEFT_SIGN = 1.0;        // -1.0 se curvando a sinistra l'angolo diventa negativo
const float SWERVE_DEG = 10.0;      // cambio di direzione verso sinistra che conta come "mi sposto"
const char UP_AXIS = 'Z';           // asse dell'accelerometro che punta in alto con la bici dritta
const float FALL_TILT_DEG = 60.0;   // bici a terra
const unsigned long FALL_HOLD_MS = 3000;
const unsigned long FALL_COUNTDOWN_MS = 30000;
const unsigned long SOS_LONG_PRESS_MS = 3000;

Adafruit_NeoPixel strip(NUM_LEDS, PIN_STRIP, NEO_GRB + NEO_KHZ800);
ModulinoMovement imu;

volatile int riskL = 0, riskB = 0, riskR = 0, riskCls = 0, riskTtcDs = 999, camOk = 0;
volatile unsigned long lastRiskMs = 0;

long usCm = -1;
long usBuf[3] = {-1, -1, -1};
int usIdx = 0;
float gyroBias = 0, yawAngle = 0;
bool swerving = false;
int swerveAnswer = 0;  // 0 libero, 2 pericolo
unsigned long swerveEndMs = 0, tiltSinceMs = 0;
int fallState = 0;     // 0 normale, 1 conto alla rovescia, 2 SOS inviato
unsigned long fallStartMs = 0, buttonDownMs = 0;
bool buttonWasDown = false;
unsigned long lastImuMs = 0, lastLedMs = 0, lastHbMs = 0, lastUsMs = 0;

// ---------------------------------------------------------------- dal lato Linux
void risk(int l, int b, int r, int cls, int ttcDs, int cam) {
  riskL = l; riskB = b; riskR = r; riskCls = cls; riskTtcDs = ttcDs; camOk = cam;
  lastRiskMs = millis();
}

bool linkOk(unsigned long now) { return lastRiskMs != 0 && now - lastRiskMs < LINK_TIMEOUT_MS; }

// ---------------------------------------------------------------- sensori
long readUltrasonicCm() {
  digitalWrite(PIN_TRIG, LOW); delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10); digitalWrite(PIN_TRIG, LOW);
  unsigned long t0 = micros();
  while (digitalRead(PIN_ECHO) == LOW) { if (micros() - t0 > 5000) return -1; }
  unsigned long start = micros();
  while (digitalRead(PIN_ECHO) == HIGH) { if (micros() - start > 25000) return -1; }
  return (micros() - start) / 58;
}

long median3(long a, long b, long c) {
  if (a < 0) a = 9999; if (b < 0) b = 9999; if (c < 0) c = 9999;
  long m = max(min(a, b), min(max(a, b), c));
  return m >= 9999 ? -1 : m;
}

int nearLevel() {
  if (usCm < 0) return 0;
  return usCm < NEAR_RED_CM ? 2 : (usCm < NEAR_AMBER_CM ? 1 : 0);
}

float axisValue(char axis, float x, float y, float z) { return axis == 'X' ? x : (axis == 'Y' ? y : z); }

float readYawRate() { return axisValue(YAW_AXIS, imu.getRoll(), imu.getPitch(), imu.getYaw()); }

void calibrateGyro() {
  float sum = 0;
  for (int i = 0; i < 100; i++) { imu.update(); sum += readYawRate(); delay(5); }
  gyroBias = sum / 100.0;
}

void updateImu(unsigned long now, float dt) {
  imu.update();
  float ax = imu.getX(), ay = imu.getY(), az = imu.getZ();

  // cambio di direzione negli ultimi istanti (integrale che torna a zero in circa 1 s)
  yawAngle = (yawAngle + (readYawRate() - gyroBias) * dt) * exp(-dt / 1.0);
  bool left = yawAngle * LEFT_SIGN > SWERVE_DEG;
  if (left && !swerving) {
    swerving = true;
    bool ok = linkOk(now);
    swerveAnswer = (nearLevel() >= 1 || (ok && (riskL >= 1 || riskB >= 1))) ? 2 : 0;
    Bridge.notify("look", 1, swerveAnswer);  // stesso evento della "guardata" del casco
  } else if (!left && swerving) {
    swerving = false;
    swerveEndMs = now;
  }

  // caduta: bici inclinata oltre 60° per 3 s
  float mag = sqrt(ax * ax + ay * ay + az * az);
  float up = axisValue(UP_AXIS, ax, ay, az);
  float tilt = mag > 0.1 ? acos(constrain(up / mag, -1.0, 1.0)) * 57.3 : 0;
  if (fallState == 0) {
    if (tilt > FALL_TILT_DEG) {
      if (!tiltSinceMs) tiltSinceMs = now;
      if (now - tiltSinceMs > FALL_HOLD_MS) { fallState = 1; fallStartMs = now; Bridge.notify("fall", 1); }
    } else {
      tiltSinceMs = 0;
    }
  }
}

void updateButton(unsigned long now) {
  bool down = digitalRead(PIN_BUTTON) == LOW;
  if (down && !buttonWasDown) buttonDownMs = now;
  if (down && fallState == 0 && now - buttonDownMs > SOS_LONG_PRESS_MS) { fallState = 2; Bridge.notify("fall", 2); }
  if (!down && buttonWasDown && now - buttonDownMs < SOS_LONG_PRESS_MS && fallState != 0) {
    fallState = 0; tiltSinceMs = 0; Bridge.notify("fall", 0);
  }
  buttonWasDown = down;
}

// ---------------------------------------------------------------- LED e suono
void buzz(bool on, int freq) {
  static bool was = false;
  static int wasFreq = 0;
  if (on == was && (!on || freq == wasFreq)) return;
  was = on; wasFreq = freq;
#if USE_TONE
  if (on) tone(PIN_BUZZER, freq); else noTone(PIN_BUZZER);
#else
  analogWrite(PIN_BUZZER, on ? 128 : 0);
#endif
}

uint32_t rgb(uint8_t r, uint8_t g, uint8_t b) {
  return strip.Color((uint16_t)r * HUD_MAX / 255, (uint16_t)g * HUD_MAX / 255, (uint16_t)b * HUD_MAX / 255);
}

uint32_t levelColor(int lvl, unsigned long now) {
  if (lvl >= 2) return (now / 120) % 2 ? rgb(255, 0, 0) : rgb(60, 0, 0);
  if (lvl == 1) return rgb(255, 100, 0);
  return rgb(0, 25, 0);
}

void render(unsigned long now) {
  strip.clear();
  if (fallState > 0) {
    bool ph = (now / 300) % 2;
    for (int i = 0; i < NUM_LEDS; i++) strip.setPixelColor(i, ph ? strip.Color(255, 0, 0) : strip.Color(255, 255, 255));
    strip.show();
    buzz(fallState == 1 || now - fallStartMs < FALL_COUNTDOWN_MS + 10000, ph ? 1000 : 1500);
    if (fallState == 1 && now - fallStartMs > FALL_COUNTDOWN_MS) { fallState = 2; Bridge.notify("fall", 2); }
    return;
  }

  bool ok = linkOk(now);
  bool seeing = ok && camOk;
  int L = max(seeing ? (int)riskL : 0, nearLevel());  // l'ultrasuono funziona anche senza AI
  int B = seeing ? (int)riskB : 0;
  int R = seeing ? (int)riskR : 0;
  int zones[3] = {L, B, R};
  for (int z = 0; z < 3; z++) {
    uint32_t c = levelColor(zones[z], now);
    if (!seeing && zones[z] == 0 && z != 0) c = (now / 500) % 2 ? rgb(255, 80, 0) : 0;  // AI assente: ambra lento
    strip.setPixelColor(HUD_FIRST + z, c);
  }

  // risposta allo spostamento a sinistra (resta 600 ms)
  bool showSwerve = swerving || now - swerveEndMs < 600;
  if (showSwerve) {
    uint32_t c = swerveAnswer == 2 ? rgb(255, 0, 0) : (swerving ? rgb(0, 255, 40) : 0);
    strip.setPixelColor(HUD_FIRST, c);
  }

  bool warnDriver = (seeing && (riskB >= 2 || riskL >= 2)) || nearLevel() >= 2;
  uint32_t rear = warnDriver ? ((now / 100) % 2 ? strip.Color(255, 0, 0) : strip.Color(255, 90, 0)) : strip.Color(50, 0, 0);
  for (int i = NUM_LEDS - REAR_LEDS; i < NUM_LEDS; i++) strip.setPixelColor(i, rear);
  strip.show();

  if (swerving && swerveAnswer == 2) buzz(true, 2400);
  else if (B >= 2) buzz((now / 70) % 2, 1500);
  else if (L >= 2 || R >= 2) buzz((now / 100) % 2, 2400);
  else buzz(false, 0);
}

// ---------------------------------------------------------------- setup e loop
void setup() {
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  strip.begin();
  strip.setBrightness(255);
  strip.clear();
  strip.show();

  Bridge.begin();
  Bridge.provide_safe("risk", risk);  // se non compila: Bridge.provide("risk", risk);

  Modulino.begin();
  imu.begin();
  delay(200);
  calibrateGyro();  // bici ferma all'accensione

  for (int i = 0; i < NUM_LEDS; i++) { strip.setPixelColor(i, strip.Color(0, 60, 0)); strip.show(); delay(15); }
  lastImuMs = millis();
}

void loop() {
  unsigned long now = millis();
  if (now - lastUsMs >= 40) {
    lastUsMs = now;
    usBuf[usIdx] = readUltrasonicCm();
    usIdx = (usIdx + 1) % 3;
    usCm = median3(usBuf[0], usBuf[1], usBuf[2]);
    Bridge.notify("us", (int)usCm);  // al lato Linux: sorpassi misurati e confronto con la camera
  }
  now = millis();
  if (now - lastImuMs >= 10) {
    float dt = (now - lastImuMs) / 1000.0;
    lastImuMs = now;
    updateImu(now, dt);
  }
  updateButton(now);
  if (now - lastLedMs >= 20) { lastLedMs = now; render(now); }
  if (now - lastHbMs >= 1000) {
    lastHbMs = now;
    Bridge.notify("hb", linkOk(now) ? 1 : 0, fallState, (int)yawAngle);
  }
}
