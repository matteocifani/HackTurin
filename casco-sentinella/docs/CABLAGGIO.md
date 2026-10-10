# CABLAGGIO — collegamenti verificati

Compilare **solo dopo** aver verificato il collegamento sulla scheda reale (vedi `TEST_LOG.md`). Niente collegamenti presunti.

Vincoli noti: header e Qwiic della UNO Q a **3,3 V**; Qwiic = bus `Wire1`.

| Componente | Pin componente | Pin UNO Q | Tensione | Verificato (data) |
|---|---|---|---|---|
| Modulino Movement | Qwiic | Connettore Qwiic | 3,3 V | |
| Pulsante annulla | — | Dx con `INPUT_PULLUP`, altro capo a GND | 3,3 V | |
| Buzzer | SIG / VCC / GND | Dx / 3,3 V / GND | 3,3 V | |
| LED stato | — | (matrice LED a bordo o Dx + resistenza) | 3,3 V | |
