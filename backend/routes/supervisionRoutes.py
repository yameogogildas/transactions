from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from fastapi_jwt_auth import AuthJWT
from controllers.authController import get_db
from models import Utilisateur, Transaction
from sqlalchemy import func

supervision_router = APIRouter(
    prefix="/supervision",
    tags=["Supervision"]
)

ALLOWED_ROLES = {"service", "superviseur", "admin", "supervisor"}

@supervision_router.get("/resume")
def supervision_resume(
    db: Session = Depends(get_db),
    Authorize: AuthJWT = Depends()
):
    # ✅ Auth
    try:
        Authorize.jwt_required()
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentification requise.")
    utilisateur_email = Authorize.get_jwt_subject()

    # ✅ Rôle: service / superviseur / admin
    utilisateur = db.query(Utilisateur).filter(Utilisateur.email == utilisateur_email).first()
    role = (getattr(utilisateur, "role", "") or "").lower()
    if not utilisateur or role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Accès refusé : rôle 'service' ou 'superviseur' requis.")

    try:
        # ✅ Total par service
        total_par_service_raw = (
            db.query(
                Transaction.service.label("service"),
                func.count().label("nombre"),
                func.coalesce(func.sum(Transaction.montant), 0).label("montant_total")
            )
            .group_by(Transaction.service)
            .all()
        )

        # ✅ Total par devise
        total_par_devise_raw = (
            db.query(
                Transaction.devise.label("devise"),
                func.coalesce(func.sum(Transaction.montant), 0).label("montant_total")
            )
            .group_by(Transaction.devise)
            .all()
        )

        # ✅ Total par statut
        total_par_statut_raw = (
            db.query(
                Transaction.statut.label("statut"),
                func.count(Transaction.id).label("nombre")
            )
            .group_by(Transaction.statut)
            .all()
        )

        # ✅ Transactions avec taux de change
        transactions_avec_taux = (
            db.query(Transaction)
            .options(joinedload(Transaction.taux_change))
            .filter(Transaction.taux_change_id.isnot(None))
            .all()
        )

        result = {
            "total_par_service": [
                {
                    "service": service,
                    "nombre": int(nombre or 0),
                    "montant_total": float(montant_total or 0.0),
                }
                for service, nombre, montant_total in total_par_service_raw
            ],
            "total_par_devise": [
                {
                    "devise": devise,
                    "montant_total": float(montant_total or 0.0),
                }
                for devise, montant_total in total_par_devise_raw
            ],
            "total_par_statut": [
                {
                    "statut": statut,
                    "nombre": int(nombre or 0),
                }
                for statut, nombre in total_par_statut_raw
            ],
            "transactions_avec_taux": [
                {
                    "numero_transaction": t.numero_transaction,
                    "montant": float(t.montant) if t.montant is not None else 0.0,
                    "devise": t.devise,
                    "service": t.service,
                    "statut": t.statut,  # ← ajouté
                    "date_transaction": getattr(t, "date_transaction", None),  # ← ajouté
                    "taux_change": (t.taux_change.taux if getattr(t, "taux_change", None) else None),
                    "id": t.id,  # utile si le front choisit d'utiliser l'id
                }
                for t in transactions_avec_taux
            ],
        }

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la récupération des données de supervision : {str(e)}"
        )
