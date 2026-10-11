# Diagnosi Wi-Fi della Raspberry Pi (guardaspalle)

Serve quando la Pi si avvia (LED rosso fisso, verde che lampeggia) ma non compare sull'hotspot "iPhone di Matteo", quindi non si può entrare via SSH.

## Cosa fa `diag_wifi.sh`

Al prossimo avvio la Pi esegue lo script una sola volta, in un avvio ridotto:

1. avvia NetworkManager e aspetta fino a ~50 s che provi a collegarsi alle reti salvate;
2. salva **solo informazioni** in `diag_wifi_1.txt` (poi `_2`, `_3`…) sulla partizione `bootfs`: `rfkill list`, `iw reg get`, `ip addr`, `nmcli general/device/connection`, `nmcli device wifi list` (le reti che la Pi vede), `dmesg` (driver brcmfmac), `journalctl -u NetworkManager` e `wpa_supplicant`;
3. rimette `cmdline.txt` com'era (copia `cmdline.txt.orig-diag`) e riavvia: dal secondo avvio la Pi parte normalmente.

Non tocca utenti, password, chiavi SSH, connessioni Wi-Fi salvate né `guardaspalle.service`.

## Come si attiva (chiavetta inserita nel Mac, partizione `bootfs`)

1. Copiare `diag_wifi.sh` nella radice di `bootfs`.
2. Copiare `cmdline.txt` in `cmdline.txt.orig-diag` (stessa cartella).
3. In `cmdline.txt` (una sola riga) aggiungere in fondo, separato da uno spazio:

   ```
   systemd.run=/boot/firmware/diag_wifi.sh systemd.run_success_action=reboot systemd.run_failure_action=reboot systemd.unit=kernel-command-line.target
   ```

4. Espellere la chiavetta, rimetterla nella Pi e accenderla. Aspettare ~2 minuti (la Pi si riavvia da sola una volta), poi spegnerla e rimettere la chiavetta nel Mac.
5. Leggere `diag_wifi_1.txt` in `bootfs`.

## Come si rimuove

Lo script si disattiva da solo. Per rimuoverlo del tutto a mano:

- ripristinare `cmdline.txt` da `cmdline.txt.orig-diag` su `bootfs` (o dal backup `.orig` sul Mac);
- cancellare da `bootfs` `diag_wifi.sh`, `cmdline.txt.orig-diag` e `diag_wifi_*.txt`.

## File di configurazione della chiavetta (`raspberry-config`)

Copie dei file scritti da Raspberry Pi Imager su `bootfs`, con password Wi-Fi e hash della password utente sostituiti da segnaposto (`<WIFI_PASSWORD>`, `<PASSWORD_HASH>`). Per riflashare basta usare Raspberry Pi Imager con: hostname `guardaspalle`, utente `utente`, Wi-Fi "iPhone di Matteo", paese IT, SSH attivo. Le copie `.orig` complete restano solo sul Mac (`~/Downloads/guardaspalle_demo/diagnosi_wifi/`) e non vanno pubblicate.
