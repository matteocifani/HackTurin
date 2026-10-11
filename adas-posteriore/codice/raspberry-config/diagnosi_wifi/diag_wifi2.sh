#!/bin/bash
# Diagnosi Wi-Fi una tantum n.2 per la Raspberry Pi "guardaspalle".
# Stesso meccanismo di diag_wifi.sh (systemd.run= in cmdline.txt, avvio ridotto,
# ripristino automatico di cmdline.txt e riavvio). Solo lettura: salva
# /boot/firmware/diag2_wifi_N.txt. Non scrive password nel log.

BOOT=/boot/firmware
[ -d "$BOOT" ] || BOOT=/boot

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
while [ -e "$BOOT/diag2_wifi_$n.txt" ]; do n=$((n+1)); done
OUT="$BOOT/diag2_wifi_$n.txt"

run() {
  echo "===== $* ====="
  timeout 30 "$@" 2>&1
  echo
}

{
  echo "Diagnosi Wi-Fi n.2 guardaspalle - $(date)"
  run uptime
  run vcgencmd get_throttled
  echo "===== journal persistente? ====="
  ls -ld /var/log/journal 2>&1
  journalctl --list-boots --no-pager 2>&1 | tail -5
  echo
  echo "===== spegnimenti non puliti (fsck/ext4 al boot) ====="
  dmesg 2>&1 | grep -i -E 'ext4|recovering|orphan|fsck|voltage' | tail -20
  echo
  echo "===== profili NetworkManager (nomi, permessi, dimensioni) ====="
  ls -la /etc/NetworkManager/system-connections /etc/netplan 2>&1
  echo

  run systemctl start NetworkManager
  for i in $(seq 1 45); do
    nmcli -t -f STATE general 2>/dev/null | grep -q '^connected' && break
    sleep 1
  done

  run nmcli general
  run nmcli device
  run nmcli connection show
  run ip addr show wlan0
  run ip route
  run ping -c2 -W3 8.8.8.8
  echo "===== journalctl -k -b -1 (avvio precedente) ====="
  journalctl -k -b -1 --no-pager 2>&1 | grep -i -E 'voltage|brcm|wlan|mmc|Specifying' | tail -60
  echo
  echo "===== journalctl -u NetworkManager -b -1 (avvio precedente) ====="
  journalctl -u NetworkManager -b -1 --no-pager 2>&1 | tail -120
  echo
  echo "===== dmesg (questo avvio) voltage/brcm/wlan ====="
  dmesg 2>&1 | grep -i -E 'voltage|brcmf|wlan' | tail -30
  echo
  echo "===== journalctl -u NetworkManager -b | tail -40 ====="
  journalctl -u NetworkManager -b --no-pager 2>&1 | tail -40
} > "$OUT" 2>&1

sync
exit 0
