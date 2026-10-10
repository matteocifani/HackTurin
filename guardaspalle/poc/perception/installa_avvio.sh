#!/bin/sh
# Avvio automatico sul Raspberry, una volta sola:  sh ~/poc/perception/installa_avvio.sh
# Dopo, a ogni accensione: parte bike_adas.py (camera + YOLO + rischio + server web)
# e lo schermo sul manubrio apre la dashboard a tutto schermo. Il Mac non serve più.
set -e
cd "$(dirname "$0")"

sudo cp guardaspalle.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now guardaspalle

# dashboard a tutto schermo sul Touch Display (desktop labwc di Raspberry Pi OS)
mkdir -p ~/.config/labwc
LINE='sh -c "sleep 15; chromium --kiosk --noerrdialogs --disable-infobars --incognito http://localhost:8000/?auto" &'
grep -qsF "localhost:8000" ~/.config/labwc/autostart || echo "$LINE" >> ~/.config/labwc/autostart

echo "Fatto. Stato del servizio:"
systemctl --no-pager status guardaspalle | head -5
echo "Messaggi in diretta:  journalctl -u guardaspalle -f"
