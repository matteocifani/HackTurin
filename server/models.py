"""Modelli pydantic = validazione del contratto dati SPEC §3.2 e §3.3."""

from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator

# Riquadro attorno a Torino: coordinate fuori → 422 (SPEC §7)
TORINO_LAT = (44.95, 45.20)
TORINO_LON = (7.50, 7.85)

EventType = Literal["BUCA", "CADUTA_DA_DISSESTO", "IMPATTO_VIOLENTO", "CADUTA_SENZA_CAUSA_RILEVATA"]
AlarmState = Literal["NONE", "SENT", "CANCELED", "MOVEMENT_RESUMED"]
Status = Literal["NUOVO", "VERIFICATO", "IN_LAVORAZIONE", "RISOLTO", "FALSO_POSITIVO"]

MAX_AGE_MS = 366 * 24 * 3600 * 1000  # un anno: copre anche i dati di seed (90 giorni)


class EventIn(BaseModel):
    event_id: str = Field(min_length=8, max_length=64)
    device_id: str = Field(min_length=1, max_length=64)
    age_ms: int = Field(ge=0, le=MAX_AGE_MS)
    age_uncertain: bool = False
    device_ts: Optional[str] = None            # solo informativo, non usato per i calcoli
    lat: float = Field(ge=TORINO_LAT[0], le=TORINO_LAT[1])
    lon: float = Field(ge=TORINO_LON[0], le=TORINO_LON[1])
    position_source: str = "simulated_route"
    type: EventType
    confidence: float = Field(ge=0, le=1)
    emergency: bool
    alarm_state: AlarmState
    features: dict = Field(default_factory=dict)
    classifier: str = "rules-v1"
    simulated: bool = False
    fw: Optional[str] = None

    @model_validator(mode="after")
    def check_consistency(self):
        # SPEC §3.2: emergency è true solo se alarm == "SENT"
        if self.emergency != (self.alarm_state == "SENT"):
            raise ValueError("emergency deve essere true se e solo se alarm_state == 'SENT'")
        if self.type == "BUCA" and self.alarm_state != "NONE":
            raise ValueError("un evento BUCA deve avere alarm_state 'NONE'")
        return self


class StatusPatch(BaseModel):
    status: Status


class HeartbeatIn(BaseModel):
    device_id: str = Field(min_length=1, max_length=64)
    lat: Optional[float] = None
    lon: Optional[float] = None
    queue_len: int = 0
    mcu_ok: bool = False
    mcu_state: Optional[str] = None
    mcu_dropped: Optional[int] = None
    imu_hz: Optional[float] = None
    fw: Optional[str] = None
