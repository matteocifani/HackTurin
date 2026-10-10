// Guardaspalle - casco (Arduino UNO Q, lato STM32).
//
// Qui gira tutto quello che deve funzionare SEMPRE, anche se il Raspberry,
// la webcam o il Wi-Fi si bloccano:
//  - LED alle tempie (sinistra / destra) e luce posteriore, su una sola strip
//    che gira attorno al casco: tempia SX -> dietro -> tempia DX;
//  - "specchietto che risponde": quando giri la testa per guardare indietro,
//    lampo verde se è libero, rosso + bip se sta arrivando qualcosa;
//  - caduta: urto + casco fermo -> 30 s per premere "sto bene", poi SOS;
//  - watchdog: niente dati dal Raspberry da 1 s -> tempie ambra lente.
//
// Il rischio arriva dal lato Linux (python/main.py) con Bridge.call("risk", ...).
//
// DA VERIFICARE in App Lab, perché le API della UNO Q sono giovani:
//  - nome della libreria Bridge e Bridge.provide_safe (se non compila: Bridge.provide);
//  - tone() sul core Zephyr: se non compila, metti USE_TONE 0;
//  - libreria Modulino: getX/Y/Z in g, getRoll/Pitch/Yaw in gradi/s;
//  - quale asse del giroscopio è la rotazione della testa (YAW_AXIS) e il segno (LOOK_LEFT_SIGN).

#include <Arduino_RouterBridge.h>
#include <Adafruit_NeoPixel.h>  // >= 1.15.5 (FastLED non compila sulla UNO Q)
#include <Modulino.h>

#define USE_TONE 1
#define USE_US 0  // 1 = HC-SR04 collegato alla UNO Q (demo al tavolo quando la percezione gira sul portatile)

// ---------------------------------------------------------------- collegamenti
const int PIN_STRIP = 6;   // dati della strip WS2813 (alimentazione 5V e GND dalla UNO Q)
const int PIN_BUZZER = 5;  // buzzer passivo Grove
const int PIN_BUTTON = 2;  // pulsante "sto bene" verso GND
const int PIN_TRIG = 7;    // HC-SR04 (solo con USE_US): VCC al 5V, Echo diretto (pin tolleranti a 5 V, tranne D3)
const int PIN_ECHO = 8;

// ---------------------------------------------------------------- strip attorno al casco
const int NUM_LEDS = 30;      // 1 m a 30 LED/m
const int TEMPLE_LEDS = 3;    // LED per ogni tempia, alle estremità della strip
const int REAR_LEDS = 10;     // LED centrali, dietro, verso l'automobilista
const bool FLIP_SIDES = false;  // true se la strip parte dalla tempia destra
const uint8_t TEMPLE_MAX = 90;  // luminosità massima alle tempie: visibile ma non abbagliante

// ---------------------------------------------------------------- soglie
const unsigned long LINK_TIMEOUT_MS = 1000;
const float LOOK_DEG = 35.0;              // testa girata oltre questo angolo...
const unsigned long LOOK_HOLD_MS = 150;   // ...per almeno questo tempo
const float LOOK_LEFT_SIGN = 1.0;         // -1.0 se girando a sinistra l'angolo diventa negativo
const char YAW_AXIS = 'Z';                // asse del giroscopio verticale con il casco in testa
const float IMPACT_G = 2.5;
const unsigned long FALL_CHECK_MS = 1500;     // dopo l'urto aspetta e guarda se il casco è fermo
const float STILL_DPS = 40.0;
const unsigned long FALL_COUNTDOWN_MS = 30000;
const unsigned long SOS_LONG_PRESS_MS = 3000;

Adafruit_NeoPixel strip(NUM_LEDS, PIN_STRIP, NEO_GRB + NEO_KHZ800);
ModulinoMovement imu;

// rischio dal Raspberry
volatile int riskL = 0, riskB = 0, riskR = 0, riskCls = 0, riskTtcDs = 999, camOk = 0;
volatile unsigned long lastRiskMs = 0;

// testa e caduta
float gyroBias = 0, yawAngle = 0;
float gyroMag = 0, accMag = 1;
int lookDir = 0;  // +1 sinistra, -1 destra, 0 avanti
int lookAnswer = 0;  // 0 verde, 1 sconosciuto (niente dati), 2 rosso
unsigned long lookCandidateMs = 0, lookEndMs = 0;
int fallState = 0;  // 0 normale, 1 conto alla rovescia, 2 SOS inviato
unsigned long impactMs = 0, fallStartMs = 0, stillSinceMs = 0;
unsigned long buttonDownMs = 0;
bool buttonWasDown = false;

unsigned long lastImuMs = 0, lastLedMs = 0, lastHbMs = 0, lastUsMs = 0;

#if USE_US
long readUltrasonicCm() {
  digitalWrite(PIN_TRIG, LOW); delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10); digitalWrite(PIN_TRIG, LOW);
  unsigned long t0 = micros();
  while (digitalRead(PIN_ECHO) == LOW) { if (micros() - t0 > 5000) return -1; }
  unsigned long start = micros();
  while (digitalRead(PIN_ECHO) == HIGH) { if (micros() - start > 25000) return -1; }
  return (micros() - start) / 58;
}
#endif

// ---------------------------------------------------------------- dal lato Linux
void risk(int l, int b, int r, int cls, int ttcDs, int cam) {
  riskL = l; riskB = b; riskR = r; riskCls = cls; riskTtcDs = ttcDs; camOk = cam;
  lastRiskMs = millis();
}

bool linkOk(unsigned long now) {
  return lastRiskMs != 0 && now - lastRiskMs < LINK_TIMEOUT_MS;
}

// ---------------------------------------------------------------- buzzer
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

// ---------------------------------------------------------------- IMU: testa girata e caduta
float readYawRate() {
  if (YAW_AXIS == 'X') return imu.getRoll();
  if (YAW_AXIS == 'Y') return imu.getPitch();
  return imu.getYaw();
}

void calibrateGyro() {
  float sum = 0;
  for (int i = 0; i < 100; i++) {
    imu.update();
    sum += readYawRate();
    delay(5);
  }
  gyroBias = sum / 100.0;
}

void updateImu(unsigned long now, float dt) {
  imu.update();
  float ax = imu.getX(), ay = imu.getY(), az = imu.getZ();
  float gx = imu.getRoll(), gy = imu.getPitch(), gz = imu.getYaw();
  accMag = sqrt(ax * ax + ay * ay + az * az);
  gyroMag = sqrt(gx * gx + gy * gy + gz * gz);

  // angolo della testa: integrale del giroscopio che torna piano a zero (niente deriva)
  float rate = readYawRate() - gyroBias;
  yawAngle = (yawAngle + rate * dt) * exp(-dt / 2.0);
  float a = yawAngle * LOOK_LEFT_SIGN;

  int dir = a > LOOK_DEG ? 1 : (a < -LOOK_DEG ? -1 : 0);
  if (dir != 0 && lookDir == 0) {
    if (lookCandidateMs == 0) lookCandidateMs = now;
    if (now - lookCandidateMs >= LOOK_HOLD_MS) startLook(dir, now);
  } else if (dir == 0) {
    lookCandidateMs = 0;
    if (lookDir != 0) { lookDir = 0; lookEndMs = now; }
  }

  // caduta: urto forte, poi casco fermo
  if (fallState == 0) {
    if (accMag > IMPACT_G) { impactMs = now; stillSinceMs = 0; }
    if (impactMs && now - impactMs > 300) {
      if (gyroMag < STILL_DPS) { if (!stillSinceMs) stillSinceMs = now; }
      else stillSinceMs = 0;
      if (stillSinceMs && now - stillSinceMs > 1000) startFall(now);
      else if (now - impactMs > FALL_CHECK_MS + 2000) impactMs = 0;  // solo una botta
    }
  }
}

void startLook(int dir, unsigned long now) {
  lookDir = dir;
  lookCandidateMs = 0;
  bool ok = linkOk(now);
  int side = dir > 0 ? riskL : riskR;
  if (!ok) lookAnswer = 1;
  else if (side >= 1 || riskB >= 1) lookAnswer = 2;
  else lookAnswer = 0;
  Bridge.notify("look", dir > 0 ? 1 : -1, lookAnswer);
}

void startFall(unsigned long now) {
  fallState = 1;
  fallStartMs = now;
  impactMs = 0;
  Bridge.notify("fall", 1);
}

void updateButton(unsigned long now) {
  bool down = digitalRead(PIN_BUTTON) == LOW;
  if (down && !buttonWasDown) buttonDownMs = now;
  if (down && fallState == 0 && now - buttonDownMs > SOS_LONG_PRESS_MS) {  // SOS manuale
    fallState = 2;
    Bridge.notify("fall", 2);
  }
  if (!down && buttonWasDown && now - buttonDownMs < SOS_LONG_PRESS_MS && fallState != 0) {
    fallState = 0;  // "sto bene"
    buzz(false, 0);
    Bridge.notify("fall", 0);
  }
  buttonWasDown = down;
}

// ---------------------------------------------------------------- LED e suono
uint32_t rgb(uint8_t r, uint8_t g, uint8_t b, uint8_t maxB) {
  return strip.Color((uint16_t)r * maxB / 255, (uint16_t)g * maxB / 255, (uint16_t)b * maxB / 255);
}

uint32_t levelColor(int lvl, unsigned long now) {
  if (lvl >= 2) return (now / 120) % 2 ? rgb(255, 0, 0, TEMPLE_MAX) : rgb(60, 0, 0, TEMPLE_MAX);
  if (lvl == 1) return rgb(255, 100, 0, TEMPLE_MAX);
  return rgb(0, 25, 0, TEMPLE_MAX);  // verde appena visibile: il sistema è acceso
}

void setTemple(bool left, uint32_t c) {
  bool atStart = left != FLIP_SIDES;
  for (int i = 0; i < TEMPLE_LEDS; i++) strip.setPixelColor(atStart ? i : NUM_LEDS - 1 - i, c);
}

void setRear(uint32_t c) {
  int first = (NUM_LEDS - REAR_LEDS) / 2;
  for (int i = first; i < first + REAR_LEDS; i++) strip.setPixelColor(i, c);
}

void render(unsigned long now) {
  bool ok = linkOk(now);
  strip.clear();

  if (fallState > 0) {  // caduta: tutto lampeggia, allarme
    bool ph = (now / 300) % 2;
    uint32_t c = ph ? strip.Color(255, 0, 0) : strip.Color(255, 255, 255);
    for (int i = 0; i < NUM_LEDS; i++) strip.setPixelColor(i, c);
    strip.show();
    bool sound = fallState == 1 || now - fallStartMs < FALL_COUNTDOWN_MS + 10000;
    buzz(sound, ph ? 1000 : 1500);
    if (fallState == 1 && now - fallStartMs > FALL_COUNTDOWN_MS) {
      fallState = 2;
      Bridge.notify("fall", 2);
    }
    return;
  }

  // zone: "dietro in linea" accende entrambe le tempie
  int L = ok ? max((int)riskL, (int)riskB) : 0;
  int R = ok ? max((int)riskR, (int)riskB) : 0;
  uint32_t cl = levelColor(L, now), cr = levelColor(R, now);
  if (!ok || !camOk) {  // il sistema non vede: ambra lento dove non c'è un avviso
    uint32_t amber = (now / 500) % 2 ? rgb(255, 80, 0, TEMPLE_MAX) : 0;
    if (L == 0) cl = amber;
    if (R == 0) cr = amber;
  }

  // risposta alla guardata (resta 600 ms dopo che torni a guardare avanti)
  int shownDir = lookDir != 0 ? lookDir : 0;
  static int lastDir = 0;
  if (lookDir != 0) lastDir = lookDir;
  if (lookDir == 0 && now - lookEndMs < 600) shownDir = lastDir;
  bool lookDanger = false;
  if (shownDir != 0) {
    uint32_t c = lookAnswer == 2 ? rgb(255, 0, 0, TEMPLE_MAX)
               : lookAnswer == 1 ? rgb(255, 80, 0, TEMPLE_MAX)
               : rgb(0, 255, 40, TEMPLE_MAX);
    if (lookAnswer == 0 && lookDir == 0) c = 0;  // il verde è solo un lampo
    if (shownDir > 0) cl = c; else cr = c;
    lookDanger = lookAnswer == 2 && lookDir != 0;
  }
  setTemple(true, cl);
  setTemple(false, cr);

  // luce posteriore: tenue sempre, lampeggia verso l'automobilista quando arriva veloce o stretto
  bool warnDriver = ok && (riskB >= 2 || riskL >= 2);
  setRear(warnDriver ? ((now / 100) % 2 ? strip.Color(255, 0, 0) : strip.Color(255, 90, 0))
                     : strip.Color(50, 0, 0));
  strip.show();

  // suono: solo per il rosso
  if (lookDanger) buzz(true, 2400);
  else if (ok && riskB >= 2) buzz((now / 70) % 2, 1500);
  else if (ok && (riskL >= 2 || riskR >= 2)) buzz((now / 100) % 2, 2400);
  else buzz(false, 0);
}

// ---------------------------------------------------------------- setup e loop
void setup() {
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
#if USE_US
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
#endif
  strip.begin();
  strip.setBrightness(255);
  strip.clear();
  strip.show();

  Bridge.begin();
  Bridge.provide_safe("risk", risk);  // se non compila: Bridge.provide("risk", risk);

  Modulino.begin();
  imu.begin();
  delay(200);
  calibrateGyro();  // tenete il casco fermo all'accensione

  for (int i = 0; i < NUM_LEDS; i++) {  // giro di prova
    strip.setPixelColor(i, strip.Color(0, 60, 0));
    strip.show();
    delay(15);
  }
  lastImuMs = millis();
}

void loop() {
  unsigned long now = millis();
  if (now - lastImuMs >= 10) {
    float dt = (now - lastImuMs) / 1000.0;
    lastImuMs = now;
    updateImu(now, dt);
  }
  updateButton(now);
  if (now - lastLedMs >= 20) {
    lastLedMs = now;
    render(now);
  }
#if USE_US
  if (now - lastUsMs >= 50) {
    lastUsMs = now;
    Bridge.notify("us", (int)readUltrasonicCm());  // -1 = niente entro 4 m
  }
#endif
  if (now - lastHbMs >= 1000) {
    lastHbMs = now;
    Bridge.notify("hb", linkOk(now) ? 1 : 0, fallState, (int)yawAngle);
  }
}
