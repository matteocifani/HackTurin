#!/bin/bash
# Ripristino Wi-Fi una tantum per la Raspberry Pi "guardaspalle".
# Lanciato dal kernel (systemd.run= in cmdline.txt) in un avvio ridotto:
# 1) salva informazioni su netplan / profili di rete per capire cosa è sparito;
# 2) crea il profilo NetworkManager per "iPhone di Matteo" leggendo la password
#    da /boot/firmware/network-config (scritto da Raspberry Pi Imager);
# 3) prova a collegarsi, salva l'esito in /boot/firmware/fix_wifi_N.txt,
#    ripristina cmdline.txt originale e riavvia.
# Non tocca utenti, chiavi SSH né guardaspalle.service. Non scrive la password nel log.

BOOT=/boot/firmware
[ -d "$BOOT" ] || BOOT=/boot
SSID="iPhone di Matteo"
CON="iPhone di Matteo"

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
while [ -e "$BOOT/fix_wifi_$n.txt" ]; do n=$((n+1)); done
OUT="$BOOT/fix_wifi_$n.txt"

run() {
  echo "===== $* ====="
  timeout 30 "$@" 2>&1
  echo
}

{
  echo "Ripristino Wi-Fi guardaspalle - $(date)"

  echo "===== PRIMA: file netplan ====="
  ls -la /etc/netplan /lib/netplan /run/netplan 2>&1
  for f in /etc/netplan/*.yaml /lib/netplan/*.yaml; do [ -f "$f" ] && echo "$f: $(stat -c '%A %U %s byte' "$f"), wifi: $(grep -c -E '^ *wifis:' "$f")"; done
  echo
  echo "===== PRIMA: profili NetworkManager ====="
  ls -la /etc/NetworkManager/system-connections /run/NetworkManager/system-connections 2>&1
  echo
  echo "===== cloud-init ====="
  ls -la /etc/cloud/cloud.cfg.d 2>&1
  cloud-init status --long 2>&1 | head -20
  grep -i -E 'netplan|network' /var/log/cloud-init.log 2>/dev/null | grep -v -i -E 'password|psk|passwd' | cut -c1-200 | tail -20
  echo
  echo "===== ultime installazioni/aggiornamenti (dpkg.log) ====="
  grep -E ' (install|upgrade|remove) ' /var/log/dpkg.log 2>/dev/null | tail -30
  echo

  run systemctl start NetworkManager
  sleep 5

  PW=$(grep -A1 "\"$SSID\":" "$BOOT/network-config" | sed -n 's/^ *password: *"\(.*\)" *$/\1/p')
  if [ -z "$PW" ]; then
    echo "ERRORE: password non trovata in $BOOT/network-config"
  else
    echo "Password letta da network-config (${#PW} caratteri)"
    nmcli connection delete "$CON" >/dev/null 2>&1
    echo "===== nmcli connection add ====="
    nmcli connection add type wifi ifname wlan0 con-name "$CON" ssid "$SSID" \
      wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$PW" \
      connection.autoconnect yes connection.autoconnect-priority 100 \
      ipv4.method auto ipv6.method auto 2>&1
    echo
    unset PW
    echo "===== nmcli connection up ====="
    timeout 60 nmcli --wait 45 connection up "$CON" 2>&1
    echo
  fi

  run nmcli general
  run nmcli device
  run nmcli connection show
  run ip addr show wlan0
  echo "===== DOPO: profili salvati ====="
  ls -la /etc/NetworkManager/system-connections 2>&1
  echo
  echo "===== journalctl -u NetworkManager -b | tail -60 ====="
  journalctl -u NetworkManager -b --no-pager 2>&1 | tail -60
} > "$OUT" 2>&1

sync
exit 0
