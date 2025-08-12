from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from controllers import tauxChangeController
from schemas import TauxChangeCreate, TauxChangeResponse
from controllers.authController import get_db
from fastapi_jwt_auth import AuthJWT

taux_change_router = APIRouter(
    prefix="/tauxchange",
    tags=["taux de change"]
)

# ✅ Créer un taux de change
@taux_change_router.post("/", response_model=TauxChangeResponse, status_code=status.HTTP_201_CREATED)
def creer_taux_change(
    taux: TauxChangeCreate,
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends()
):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    print(f"[POST] Création taux par: {current_user}")
    print("Payload reçu:", taux.dict())  # 🔍 pour diagnostiquer les erreurs 422
    return tauxChangeController.creer_taux_change(taux, db)

# ✅ Lister les taux
@taux_change_router.get("/", response_model=list[TauxChangeResponse])
def lister_taux_change(
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends()
):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    print(f"[GET] Liste taux consultée par: {current_user}")
    return tauxChangeController.lister_taux_change(db)

# ✅ Mettre à jour un taux existant
@taux_change_router.put("/{taux_id}", response_model=TauxChangeResponse)
def mettre_a_jour_taux(
    taux_id: int,
    taux: TauxChangeCreate,
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends()
):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    print(f"[PUT] MAJ taux {taux_id} par: {current_user}")
    print("Payload reçu pour MAJ:", taux.dict())  # 🔍 debug
    return tauxChangeController.mettre_a_jour_taux(taux_id, taux, db)

# ✅ Supprimer un taux
@taux_change_router.delete("/{taux_id}", status_code=status.HTTP_204_NO_CONTENT)
def supprimer_taux(
    taux_id: int,
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends()
):
    Authorize.jwt_required()
    current_user = Authorize.get_jwt_subject()
    print(f"[DELETE] Suppression taux {taux_id} par: {current_user}")
    tauxChangeController.supprimer_taux(taux_id, db)
    return {"message": "Taux supprimé avec succès"}
