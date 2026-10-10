#!/usr/bin/env python3
"""
Profili per tipo di mezzo: lo stesso ADAS posteriore su bici, monopattino, auto, furgone, camion e bus.

La percezione non cambia: tempo all'impatto dalla crescita del riquadro, traiettoria laterale,
distanza misurata dall'ultrasuono. Cambiano solo pochi numeri, che dipendono dal mezzo su cui
è montato il sistema:
  - mezza larghezza del mezzo (sotto questa distanza laterale un veicolo è "in linea", rotta di collisione)
  - distanza di sorpasso considerata sicura, misurata dall'asse del mezzo
  - finestra di urgenza (TTC di inizio e di massimo)
  - soglie dell'ultrasuono (su auto e camion diventa il sensore di parcheggio / di chi ti sta incollato)
  - peso di ogni classe nel rischio: su una bici fa paura il camion, su un camion fa paura la bici
    nell'angolo cieco
  - dove arriva l'avviso: casco (solo bici e monopattino) oppure unità in cabina (LED sugli specchietti,
    buzzer, schermo)

Uso dentro bike_adas.py (vedi patch_mezzo.diff):
    profili_mezzo.aggiungi(p)          # aggiunge --mezzo al parser
    a = profili_mezzo.parse(p)         # applica i default del profilo, poi i flag espliciti vincono
    profili_mezzo.pesa_classi(CLASSES, a.mezzo)

Da solo:  python3 profili_mezzo.py   stampa la tabella dei profili.
I valori dei mezzi a motore sono ragionevoli ma non ancora tarati su strada.
"""

import argparse

# chiave del profilo -> valori. I nomi dei campi sono gli stessi "dest" di bike_adas.py,
# così diventano semplicemente i default degli argomenti.
PROFILI = {
    "bici": {
        "nome": "Bicicletta", "uscita": "casco", "lunghezza": 1.8,
        "args": {"rider_half": 0.35, "pass_safe": 1.5, "t_warn": 6.0, "t_crit": 1.5,
                 "tailgate": 5.0, "max_range": 35.0, "near_red": 150.0, "near_amber": 250.0},
        "pesi": {},  # i pesi originali di CLASSES sono pensati per la bici
    },
    "monopattino": {
        "nome": "Monopattino", "uscita": "casco", "lunghezza": 1.1,
        "args": {"rider_half": 0.30, "pass_safe": 1.5, "t_warn": 6.0, "t_crit": 1.5,
                 "tailgate": 5.0, "max_range": 35.0, "near_red": 150.0, "near_amber": 250.0},
        "pesi": {},
    },
    "auto": {
        "nome": "Auto", "uscita": "cabina", "lunghezza": 4.5,
        # pass_safe dall'asse: 0,9 m di mezza auto + 1 m di margine nel cambio corsia
        "args": {"rider_half": 0.90, "pass_safe": 1.9, "t_warn": 4.0, "t_crit": 1.2,
                 "tailgate": 6.0, "max_range": 40.0, "near_red": 60.0, "near_amber": 150.0},
        # moto e bici nell'angolo cieco sono il caso tipico del cambio corsia e della portiera aperta
        "pesi": {"persona": 0.6, "bici": 0.8, "moto": 1.1, "auto": 1.0, "bus": 1.2, "camion": 1.2},
    },
    "furgone": {
        "nome": "Furgone", "uscita": "cabina", "lunghezza": 5.5,
        "args": {"rider_half": 1.00, "pass_safe": 2.0, "t_warn": 4.5, "t_crit": 1.3,
                 "tailgate": 6.0, "max_range": 40.0, "near_red": 80.0, "near_amber": 200.0},
        "pesi": {"persona": 0.8, "bici": 1.0, "moto": 1.1, "auto": 1.0, "bus": 1.1, "camion": 1.1},
    },
    "camion": {
        "nome": "Camion", "uscita": "cabina", "lunghezza": 10.0,
        # niente specchietto interno: dietro è tutto angolo cieco, in retromarcia conta chi è a piedi
        "args": {"rider_half": 1.25, "pass_safe": 2.3, "t_warn": 5.0, "t_crit": 1.5,
                 "tailgate": 8.0, "max_range": 40.0, "near_red": 100.0, "near_amber": 250.0},
        "pesi": {"persona": 1.0, "bici": 1.2, "moto": 1.1, "auto": 0.9, "bus": 1.0, "camion": 1.0},
    },
    "bus": {
        "nome": "Autobus", "uscita": "cabina", "lunghezza": 12.0,
        "args": {"rider_half": 1.28, "pass_safe": 2.3, "t_warn": 5.0, "t_crit": 1.5,
                 "tailgate": 8.0, "max_range": 40.0, "near_red": 100.0, "near_amber": 250.0},
        "pesi": {"persona": 1.0, "bici": 1.2, "moto": 1.1, "auto": 0.9, "bus": 1.0, "camion": 1.0},
    },
}


def aggiungi(p):
    """Aggiunge --mezzo al parser di bike_adas.py."""
    p.add_argument("--mezzo", default="bici", choices=sorted(PROFILI),
                   help="mezzo su cui è montato il sistema: imposta larghezza, soglie e pesi "
                        "(i flag espliciti vincono sempre)")


def parse(p, argv=None):
    """Legge --mezzo, usa il suo profilo come default, poi analizza tutto: un flag scritto a mano vince."""
    pre = argparse.ArgumentParser(add_help=False)
    pre.add_argument("--mezzo", default="bici", choices=sorted(PROFILI))
    mezzo = pre.parse_known_args(argv)[0].mezzo
    validi = {act.dest for act in p._actions}
    p.set_defaults(**{k: v for k, v in PROFILI[mezzo]["args"].items() if k in validi})
    return p.parse_args(argv)


def pesa_classi(classes, mezzo):
    """Aggiorna sul posto il peso (4° campo) di ogni classe di CLASSES secondo il mezzo."""
    pesi = PROFILI[mezzo]["pesi"]
    for cid, row in list(classes.items()):
        if row[0] in pesi:
            classes[cid] = row[:3] + (pesi[row[0]],) + row[4:]
    return classes


def info(mezzo):
    """Cosa serve alla pagina web per disegnare il mezzo giusto."""
    pr = PROFILI[mezzo]
    return {"tipo": mezzo, "nome": pr["nome"], "uscita": pr["uscita"],
            "larghezza": round(2 * pr["args"]["rider_half"], 2), "lunghezza": pr["lunghezza"]}


if __name__ == "__main__":
    campi = ["rider_half", "pass_safe", "t_warn", "t_crit", "near_red", "near_amber"]
    print(f"{'mezzo':12} {'uscita':7} " + " ".join(f"{c:>10}" for c in campi) + "  pesi")
    for k, pr in PROFILI.items():
        print(f"{k:12} {pr['uscita']:7} " + " ".join(f"{pr['args'][c]:>10}" for c in campi)
              + "  " + (", ".join(f"{n} {w}" for n, w in pr["pesi"].items()) or "come la bici"))
