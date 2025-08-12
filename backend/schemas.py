from pydantic import BaseModel, EmailStr, confloat, constr, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

# -------------------- Utilisateur --------------------

class RoleEnum(str, Enum):
    client = "client"
    admin = "admin"
    # Ajoute d'autres rôles si nécessaire

class UtilisateurInscription(BaseModel):
    nom: constr(strip_whitespace=True, min_length=1)
    email: EmailStr
    mot_de_passe: constr(min_length=6)
    role: Optional[RoleEnum] = RoleEnum.client

class UtilisateurConnexion(BaseModel):
    email: EmailStr
    mot_de_passe: str

class UtilisateurReponse(BaseModel):
    id: int
    nom: str
    email: EmailStr
    role: RoleEnum

    class Config:
        orm_mode = True

# -------------------- Taux de Change --------------------

class TauxChangeBase(BaseModel):
    devise_source: constr(strip_whitespace=True, min_length=1)
    devise_cible: constr(strip_whitespace=True, min_length=1)
    taux: confloat(gt=0)

    @validator('devise_cible')
    def devises_differentes(cls, v, values):
        if 'devise_source' in values and v == values['devise_source']:
            raise ValueError("La devise source et la devise cible doivent être différentes.")
        return v

class TauxChangeCreate(TauxChangeBase):
    pass

class TauxChangeResponse(TauxChangeBase):
    id: int
    date_enregistrement: datetime

    class Config:
        orm_mode = True

# -------------------- Transaction --------------------

class StatutTransactionEnum(str, Enum):
    en_attente = "en attente"
    validee = "validée"
    annulee = "annulée"

class TransactionBase(BaseModel):
    montant: confloat(gt=0, le=1e6)
    devise: constr(strip_whitespace=True, min_length=1)
    service: constr(strip_whitespace=True, min_length=1)
    numero_transaction: constr(strip_whitespace=True, min_length=1)
    statut: Optional[StatutTransactionEnum] = StatutTransactionEnum.en_attente
    taux_change_id: Optional[int]

    @validator('taux_change_id')
    def taux_change_valid(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Le taux de change ID doit être positif.")
        return v

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(BaseModel):
    montant: Optional[confloat(gt=0)] = None
    devise: Optional[constr(strip_whitespace=True, min_length=1)] = None
    service: Optional[constr(strip_whitespace=True, min_length=1)] = None
    numero_transaction: Optional[constr(strip_whitespace=True, min_length=1)] = None
    statut: Optional[StatutTransactionEnum] = None
    taux_change_id: Optional[int] = None

    @validator('taux_change_id')
    def taux_change_valid(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Le taux de change ID doit être positif.")
        return v

class TransactionUpdateStatut(BaseModel):
    statut: StatutTransactionEnum

# --- Réponse enrichie (pour supervision / admin) ---
class TransactionReponse(TransactionBase):
    id: int
    date_transaction: datetime

    class Config:
        orm_mode = True

class TransactionDetail(TransactionReponse):
    utilisateur: UtilisateurReponse
    taux_change: Optional[TauxChangeResponse]

# -------------------- Alerte --------------------

class AlerteResponse(BaseModel):
    id: int
    transaction_id: int
    motif: str
    date_alerte: datetime

    class Config:
        orm_mode = True

# -------------------- Supervision --------------------

class SupervisionTransaction(BaseModel):
    numero_transaction: str
    montant_total: float
    nombre: int

    class Config:
        orm_mode = True

class SupervisionResponse(BaseModel):
    total_par_service: List[SupervisionTransaction]
    total_par_devise: List[SupervisionTransaction]

    class Config:
        orm_mode = True
