# routes/utilisateurRoutes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi_jwt_auth import AuthJWT
from controllers.authController import get_db
from models import Utilisateur

utilisateur_router = APIRouter(
    prefix="/utilisateur",
    tags=["Utilisateur"]
)

@utilisateur_router.get("/profil")
def lire_profil(Authorize: AuthJWT = Depends(), db: Session = Depends(get_db)):
    try:
        Authorize.jwt_required()
        email = Authorize.get_jwt_subject()
        utilisateur = db.query(Utilisateur).filter(Utilisateur.email == email).first()
        if not utilisateur:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
        return {
            "nom": utilisateur.nom,
            "email": utilisateur.email,
            "role": utilisateur.role
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Accès non autorisé.")
