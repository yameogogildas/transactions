from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Utilisateur
from fastapi_jwt_auth import AuthJWT


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_profil(Authorize: AuthJWT = Depends(), db: Session = Depends(get_db)) -> Utilisateur:
    """
    Récupérer les informations du profil utilisateur connecté via le JWT.
    """
    Authorize.jwt_required()
    utilisateur_email = Authorize.get_jwt_subject()

    utilisateur = db.query(Utilisateur).filter(Utilisateur.email == utilisateur_email).first()
    if not utilisateur:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")

    return utilisateur
