#include <Modulino.h>
#include <Arduino_RouterBridge.h>
#include <math.h>

#define DEBUG_STATUS 1   // 1 = riga di stato ogni 500 ms; 0 = solo eventi

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

// Ogni stampa blocca il loop: dopo averla fatta si azzera il delta del
// campione successivo, altrimenti il salto di tempo sembrerebbe un urto.
static void logEv(const char* msg, float v) {
  Serial.print('['); Serial.print(millis()); Serial.print(" ms] ");
  Serial.print(msg); Serial.print(' '); Serial.println(v, 3);
  resync = true;
}

// Avviso al Linux della scheda (che lo manda al telefono via Bluetooth).
//   "IMPACT": prima parte (dRMS sopra soglia). value = dRMS in mg
//   "FALL"  : allarme di caduta.               value = inclinazione in gradi
static void alertLinux(const char* type, int value) {
  Bridge.notify("alert", String(type), value, (uint32_t)millis());
  Serial.print("-> alert "); Serial.print(type); Serial.print(' '); Serial.println(value);
  resync = true;
}

void setup() {
  Serial.begin(115200);
  Modulino.begin();
  imu.begin();
  Serial.println(Bridge.begin() ? "bridge ok" : "bridge NON disponibile");
}

void loop() {
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
        }
        st = NORMAL;
      }
      break;
  }

#if DEBUG_STATUS
  if (millis() - tStatus >= 500) {
    tStatus = millis();
    Serial.print(NAME[st]);
    Serial.print(" drms="); Serial.print(drms, 3);
    Serial.print(" peak="); Serial.print(peak, 3);
    Serial.print(" |a|="); Serial.print(n, 2);
    Serial.print(" ang="); Serial.println(ang, 1);
    peak = 0; resync = true;
  }
#endif
}
