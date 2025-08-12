from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi_jwt_auth import AuthJWT

from controllers import authController
from schemas import UtilisateurInscription, UtilisateurConnexion, UtilisateurReponse

auth_router = APIRouter(
    prefix="/authentification",
    tags=["Authentification"]
)

# Route d'inscription
@auth_router.post(
    "/inscription",
    response_model=UtilisateurReponse,
    status_code=status.HTTP_201_CREATED
)
def inscription(
    utilisateur: UtilisateurInscription,
    db: Session = Depends(authController.get_db)
):
    """
    Crée un nouvel utilisateur dans la base de données.
    """
    return authController.inscrire_utilisateur(utilisateur, db)

# Route de connexion
@auth_router.post("/connexion")
def connexion(
    utilisateur: UtilisateurConnexion,
    Authorize: AuthJWT = Depends(),
    db: Session = Depends(authController.get_db)
):
    """
    Authentifie un utilisateur et retourne un token JWT.
    """
    return authController.connexion_utilisateur(utilisateur, Authorize, db)

# Route de renouvellement de token
@auth_router.post("/renouveler-token")
def renouveler_token(Authorize: AuthJWT = Depends()):
    """
    Renouvelle le token d'accès via un refresh token.
    """
    return authController.renouveler_token(Authorize)
