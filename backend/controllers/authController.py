from fastapi import HTTPException
from sqlalchemy.orm import Session
from models import Utilisateur
from passlib.hash import bcrypt
from fastapi_jwt_auth import AuthJWT
from schemas import UtilisateurInscription, UtilisateurConnexion
from database import SessionLocal

# 🔧 Fonction pour obtenir une session de base de données
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ✅ Inscription d’un nouvel utilisateur
VALID_ROLES = ['client', 'agent', 'service']  # Rôles valides

def inscrire_utilisateur(utilisateur: UtilisateurInscription, db: Session):
    print(f"[INSCRIPTION] Tentative avec l'email : {utilisateur.email}")

    # Vérification si l'email est déjà utilisé
    if db.query(Utilisateur).filter(Utilisateur.email == utilisateur.email).first():
        print("[ERREUR] Email déjà utilisé.")
        raise HTTPException(status_code=400, detail="L'adresse email est déjà utilisée.")
    
    # Vérification si le nom est déjà utilisé
    if db.query(Utilisateur).filter(Utilisateur.nom == utilisateur.nom).first():
        print("[ERREUR] Nom déjà utilisé.")
        raise HTTPException(status_code=400, detail="Le nom est déjà utilisé.")
    
    # Validation du rôle (assure-toi que le rôle est parmi ceux définis)
    if utilisateur.role not in VALID_ROLES:
        print("[ERREUR] Rôle invalide.")
        raise HTTPException(status_code=400, detail="Rôle invalide. Les rôles valides sont : client, agent, service.")
    
    # Hachage du mot de passe
    mot_de_passe_hache = bcrypt.hash(utilisateur.mot_de_passe)
    print("[INFO] Mot de passe haché.")

    # Création du nouvel utilisateur avec le rôle validé
    nouvel_utilisateur = Utilisateur(
        nom=utilisateur.nom,
        email=utilisateur.email,
        mot_de_passe=mot_de_passe_hache,
        role=utilisateur.role  # Enregistrement du rôle choisi
    )

    # Ajouter l'utilisateur à la base de données
    db.add(nouvel_utilisateur)
    db.commit()
    db.refresh(nouvel_utilisateur)

    print("[SUCCÈS] Nouvel utilisateur inscrit avec succès.")
    return nouvel_utilisateur

# ✅ Connexion d’un utilisateur
def connexion_utilisateur(utilisateur: UtilisateurConnexion, Authorize: AuthJWT, db: Session):
    print(f"[CONNEXION] Tentative pour l'email : {utilisateur.email}")

    db_utilisateur = db.query(Utilisateur).filter(Utilisateur.email == utilisateur.email).first()

    if not db_utilisateur:
        print("[ERREUR] Utilisateur non trouvé.")
        raise HTTPException(status_code=401, detail="Email ou mot de passe invalide.")
    
    if not bcrypt.verify(utilisateur.mot_de_passe, db_utilisateur.mot_de_passe):
        print("[ERREUR] Mot de passe incorrect.")
        raise HTTPException(status_code=401, detail="Email ou mot de passe invalide.")
    
    print("[INFO] Authentification réussie, génération des tokens.")
    access_token = Authorize.create_access_token(subject=db_utilisateur.email)
    refresh_token = Authorize.create_refresh_token(subject=db_utilisateur.email)

    print("[SUCCÈS] Connexion validée.")
    return {
        "message": "Connexion réussie.",
        "token_acces": access_token,
        "token_actualisation": refresh_token,
        "nom": db_utilisateur.nom,
        "email": db_utilisateur.email,
        "role": db_utilisateur.role
    }

# 🔄 Renouvellement de token
def renouveler_token(Authorize: AuthJWT):
    try:
        Authorize.jwt_refresh_token_required()
    except Exception:
        print("[ERREUR] Token de rafraîchissement invalide ou expiré.")
        raise HTTPException(status_code=401, detail="Token de rafraîchissement invalide ou expiré.")
    
    utilisateur_courant = Authorize.get_jwt_subject()
    nouveau_token = Authorize.create_access_token(subject=utilisateur_courant)

    print("[INFO] Nouveau token d'accès généré.")
    return {
        "token_acces": nouveau_token,
        "message": "Nouveau token d'accès généré avec succès."
    }
