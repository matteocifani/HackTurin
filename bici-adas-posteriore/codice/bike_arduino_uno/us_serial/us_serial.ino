// Guardaspalle - ultrasuono sulla bici con una Arduino UNO (R3 o R4) collegata in USB
// al portatile (o al Raspberry). Manda "U,<cm>" 25 volte al secondo; -1 = niente entro 4 m.
// Sul portatile: python3 perception/bike_adas.py --source 0 --us-serial <porta>
//
// HC-SR04: VCC -> 5V, GND -> GND, TRIG -> D7, ECHO -> D8 (la UNO è a 5 V: niente partitore).

const int PIN_TRIG = 7;
const int PIN_ECHO = 8;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
}

void loop() {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  unsigned long us = pulseIn(PIN_ECHO, HIGH, 25000);  // 25 ms = circa 4 m
  long cm = us == 0 ? -1 : (long)(us / 58);
  Serial.print("U,");
  Serial.println(cm);
  delay(15);  // circa 40 ms per lettura, compreso l'eco
}
