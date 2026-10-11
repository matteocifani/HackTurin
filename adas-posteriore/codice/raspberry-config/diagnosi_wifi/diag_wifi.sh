#!/bin/bash
# Diagnosi Wi-Fi una tantum per la Raspberry Pi "guardaspalle".
# Viene lanciato dal kernel (systemd.run= in cmdline.txt) in un avvio ridotto,
# avvia NetworkManager, aspetta che provi a collegarsi, SALVA solo informazioni
# in /boot/firmware/diag_wifi_N.txt, ripristina cmdline.txt originale e riavvia.
# Non modifica utenti, chiavi SSH, connessioni Wi-Fi o altri file di sistema.

BOOT=/boot/firmware
[ -d "$BOOT" ] || BOOT=/boot

# Disattiva subito se stesso: al prossimo avvio la Pi parte normalmente.
restore_cmdline() {
  if [ -f "$BOOT/cmdline.txt.orig-diag" ]; then
    cp "$BOOT/cmdline.txt.orig-diag" "$BOOT/cmdline.txt"
  else
    sed -i 's| systemd.run=[^ ]*||g; s| systemd.run_success_action=[^ ]*||g; s| systemd.run_failure_action=[^ ]*||g; s| systemd.unit=kernel-command-line.target||g' "$BOOT/cmdline.txt"
  fi
  sync
}
trap restore_cmdline EXIT

n=1
while [ -e "$BOOT/diag_wifi_$n.txt" ]; do n=$((n+1)); done
OUT="$BOOT/diag_wifi_$n.txt"

run() {
  echo "===== $* ====="
  timeout 20 "$@" 2>&1
  echo
}

{
  echo "Diagnosi Wi-Fi guardaspalle - $(date)"
  run uname -a
  run cat /proc/device-tree/model
  run rfkill list
  run iw reg get
  run ip addr

  # NetworkManager non parte da solo in questo avvio ridotto: lo avviamo
  # e gli diamo tempo di tentare la connessione alle reti salvate.
  run systemctl start NetworkManager
  for i in $(seq 1 45); do
    nmcli -t -f STATE general 2>/dev/null | grep -q '^connected' && break
    sleep 1
  done
  nmcli device wifi rescan >/dev/null 2>&1
  sleep 8

  run nmcli general
  run nmcli device
  run nmcli connection show
  run nmcli -f IN-USE,SSID,BSSID,MODE,CHAN,FREQ,SIGNAL,SECURITY device wifi list
  run ip addr
  echo "===== dmesg | grep -i -E 'brcm|wlan|cfg80211|mmc' ====="
  dmesg 2>&1 | grep -i -E 'brcm|wlan|cfg80211|mmc' | tail -60
  echo
  echo "===== journalctl -u NetworkManager -b | tail -100 ====="
  journalctl -u NetworkManager -b --no-pager 2>&1 | tail -100
  echo
  echo "===== journalctl -u wpa_supplicant -b | tail -40 ====="
  journalctl -u wpa_supplicant -b --no-pager 2>&1 | tail -40
  echo
  echo "===== journalctl -b -1 (avvio precedente) NetworkManager | tail -60 ====="
  journalctl -u NetworkManager -b -1 --no-pager 2>&1 | tail -60
} > "$OUT" 2>&1

sync
exit 0
