# routes/alertesRoutes.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from fastapi_jwt_auth import AuthJWT
from controllers.authController import get_db
from models import Transaction

alertes_router = APIRouter(
    prefix="/alertes",
    tags=["Alertes"]
)

@alertes_router.get("/")
def alertes_suspectes(db: Session = Depends(get_db), Authorize: AuthJWT = Depends()):
    Authorize.jwt_required()

    SEUIL = 10000  # Exemple de seuil

    alertes = db.query(Transaction).filter(Transaction.montant > SEUIL).all()

    return [
        {
            "id": transaction.id,
            "montant": transaction.montant,
            "service": transaction.service,
            "client": transaction.client_id,
            "statut": transaction.statut,
            "date": transaction.date
        } for transaction in alertes
    ]
