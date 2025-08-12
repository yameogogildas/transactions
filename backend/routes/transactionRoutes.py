from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_jwt_auth import AuthJWT
from sqlalchemy.orm import Session

from controllers import transactionController
from schemas import (
    TransactionCreate,
    TransactionReponse,
    TransactionUpdateStatut,
    TransactionUpdate,
)
from controllers.authController import get_db
from models import Utilisateur, Transaction

transaction_router = APIRouter(prefix="/transactions", tags=["transactions"])

# --------- Helpers ----------
def get_current_user(
    Authorize: AuthJWT = Depends(), db: Session = Depends(get_db)
) -> Utilisateur:
    try:
        Authorize.jwt_required()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise."
        )

    utilisateur_email = Authorize.get_jwt_subject()
    if not utilisateur_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Jeton invalide: sujet manquant."
        )

    utilisateur = (
        db.query(Utilisateur)
        .filter(Utilisateur.email == utilisateur_email)
        .first()
    )
    if not utilisateur:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé."
        )
    return utilisateur


def require_role(user: Utilisateur, role: str) -> None:
    if str(user.role or "").lower() != role.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Accès réservé au rôle '{role}'."
        )

def require_one_of(user: Utilisateur, roles: List[str]) -> None:
    role_user = str(user.role or "").lower()
    allowed = {str(r).lower() for r in roles}
    if role_user not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Accès réservé aux rôles: {', '.join(roles)}."
        )

# --------- Endpoints ----------

# ✅ Créer une transaction
@transaction_router.post("/", response_model=TransactionReponse, status_code=status.HTTP_201_CREATED)
def creer_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    return transactionController.creer_transaction(transaction, user.email, db)

# ✅ Lister toutes les transactions (selon rôle)
@transaction_router.get("/", response_model=List[TransactionReponse])
def lister_transactions(
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    return transactionController.lister_transactions(user.email, user.role, db)

# ✅ Mes transactions
@transaction_router.get("/mes-transactions", response_model=List[TransactionReponse])
def mes_transactions(
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    return transactionController.lister_transactions(user.email, user.role, db)

# ✅ Modifier le statut (par ID) — superviseur/admin
@transaction_router.patch("/{transaction_id}/status", response_model=TransactionReponse)
def changer_statut_par_id(
    transaction_id: int,
    update: TransactionUpdateStatut,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    require_one_of(user, ["superviseur", "admin", "supervisor"])

    valeurs_autorisees = {"en attente", "validée", "annulée"}
    if update.statut not in valeurs_autorisees:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Statut invalide. Valeurs autorisées: {', '.join(valeurs_autorisees)}"
        )

    # Utilise la logique métier du controller
    if update.statut in {"validée", "annulée"}:
        tx = transactionController.changer_statut_transaction(transaction_id, update.statut, db)
    else:
        # on autorise aussi repasser à "en attente" si nécessaire
        tx_obj = db.query(Transaction).filter(Transaction.id == transaction_id).first()
        if not tx_obj:
            raise HTTPException(status_code=404, detail="Transaction non trouvée.")
        tx_obj.statut = update.statut
        db.commit()
        db.refresh(tx_obj)
        tx = tx_obj

    return tx

# ✅ Modifier le statut (par NUMÉRO) — service/superviseur/admin
@transaction_router.patch("/{numero_transaction}/statut", response_model=TransactionReponse)
def changer_statut_par_numero(
    numero_transaction: str,
    update: TransactionUpdateStatut,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    # ← ICI on ajoute "service"
    require_one_of(user, ["service", "superviseur", "admin", "supervisor"])

    valeurs_autorisees = {"en attente", "validée", "annulée"}
    if update.statut not in valeurs_autorisees:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Statut invalide. Valeurs autorisées: {', '.join(valeurs_autorisees)}"
        )

    if update.statut in {"validée", "annulée"}:
        tx = transactionController.changer_statut_transaction_par_numero(numero_transaction, update.statut, db)
    else:
        tx_obj = db.query(Transaction).filter(Transaction.numero_transaction == numero_transaction).first()
        if not tx_obj:
            raise HTTPException(status_code=404, detail="Transaction non trouvée.")
        tx_obj.statut = update.statut
        db.commit()
        db.refresh(tx_obj)
        tx = tx_obj

    return tx


# ✅ Supervision (service)
@transaction_router.get("/supervision/resume", response_model=Dict[str, Any])
def supervision_resume(
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    require_role(user, "service")
    payload = transactionController.tableau_de_bord_supervision(db)
    if "alerts_count" not in payload:
        try:
            txs = payload.get("transactions_avec_taux") or []
            alerts_count = sum(1 for t in txs if float(t.get("montant", 0)) > 200)
            payload["alerts_count"] = alerts_count
        except Exception:
            payload.setdefault("alerts_count", 0)
    return payload

# ✅ Supprimer une transaction
@transaction_router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def supprimer_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    transactionController.supprimer_transaction(transaction_id, user.email, db)
    return

# ✅ Modifier une transaction (statut "en attente")
@transaction_router.put("/{transaction_id}", response_model=TransactionReponse)
def modifier_transaction(
    transaction_id: int,
    update_data: TransactionUpdate,
    db: Session = Depends(get_db),
    user: Utilisateur = Depends(get_current_user),
):
    return transactionController.modifier_transaction(transaction_id, update_data, user.email, db)
