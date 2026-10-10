# Casco con avviso di prossimità — scope iniziale

Stato: scope storico, superato. Il riferimento attuale è `MVP-BICI-CASCO.md`: Raspberry Pi 4 con webcam e prossimità sulla bici; UNO Q con Modulino Movement e LED sul casco. `FATTIBILITA-BICI.md` conserva la valutazione dell'architettura intermedia. Il testo seguente non rappresenta i requisiti attuali.

## Obiettivo

Realizzare un prototipo da hackathon che monitora un settore dietro la testa, esterno al campo visivo del ciclista, ed emette un avviso sonoro quando un oggetto entra nella zona di prossimità.

La dimostrazione iniziale avviene indoor, a distanze inferiori a un metro, con un solo sensore. Il sistema dimostra prossimità: non identifica il tipo di oggetto e non richiede di distinguerne l'avvicinamento dall'allontanamento.

## Settore monitorato

- Il sensore è solidale al casco: il settore osservato segue la rotazione della testa. Questo comportamento è intenzionale.
- Si monitora una porzione della zona non vista, non l'intero angolo cieco né una copertura a 360°.
- Per la demo si assume che la direzione dello sguardo segua quella della testa; non si misurano i movimenti oculari.
- La rotazione della testa e il conseguente spostamento del settore monitorato possono essere mostrati nella demo.

## Hardware candidato e vincoli

- Arduino UNO Q 4 GB: controllo del sistema.
- Arduino Modulino Distance: misura della distanza in un singolo settore.
- Grove Passive Buzzer: avviso sonoro locale.
- Supporto rimovibile sul casco e cablaggio da definire in BOM.
- Alimentazione USB-C adeguata alla UNO Q; batteria integrata non richiesta per l'MVP.

Il Modulino Distance documentato usa il VL53L4CD: portata dichiarata circa 1,2 m e campo visivo diagonale di 18°. Questi valori non garantiscono la stessa prestazione in ogni condizione; la portata utile va verificata sul banco.

La BOM è ancora preliminare: disponibilità effettiva, variante del buzzer, lunghezza dei cavi, montaggio e fonte di alimentazione vanno verificati.

## Fuori dallo scope iniziale

- Preavviso di alcuni secondi per veicoli in arrivo su strada.
- Riconoscimento dei veicoli, stima della velocità relativa o del tempo alla collisione.
- Copertura completa della zona cieca o a 360°.
- Rilevamento cadute, monitoraggio della distrazione, SOS e GPS.
- App mobile, cloud e comunicazione BLE come requisiti di funzionamento.
- Validazione su strada, impermeabilizzazione e sviluppo di un prodotto certificato.

Il preavviso dei veicoli rimane una possibile evoluzione, subordinata a sensori con portata adeguata. Eventuali prove outdoor del prototipo sono esplorative e non cambiano il requisito della demo indoor.

## Parametri e criteri proposti, ancora da confermare

- Due livelli di avviso acustico, con soglie iniziali indicative di 80 cm e 40 cm.
- Filtraggio breve delle distanze e isteresi sulle soglie.
- Gestione esplicita di letture non valide e sensore scollegato; assenza di misura non equivale a settore libero.
- Distanza e stato visualizzabili sul computer per il debug e la presentazione.
- Obiettivi di prova: almeno 9 avvisi corretti su 10 avvicinamenti controllati, risposta entro 300 ms dall'attraversamento della soglia, assenza di oscillazioni continue dello stato con oggetto fermo, segnalazione di sensore scollegato.

Questi sono obiettivi da tarare e misurare, non prestazioni già ottenute.

## Riferimenti

- Documento di partenza: `Casco_sensorizzato latex.pdf`.
- Inventario: https://docs.google.com/spreadsheets/d/1PvS6k1NpJ_NDBajdZHSybFE0vQDN1Z_sUnZF2HBoCL8/edit?gid=1584658223
- Modulino Distance: https://store.arduino.cc/products/modulino-distance
- Sensore VL53L4CD: https://www.st.com/en/imaging-and-photonics-solutions/vl53l4cd.html
- UNO Q: https://docs.arduino.cc/tutorials/uno-q/user-manual/
- Buzzer: https://wiki.seeedstudio.com/Grove-Passive-Buzzer/
