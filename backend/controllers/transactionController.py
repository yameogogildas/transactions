from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from models import Transaction, Utilisateur, TauxChange
from schemas import TransactionCreate, TransactionUpdate

# ✅ Créer une nouvelle transaction (avec taux_change_id si fourni)
def creer_transaction(transaction: TransactionCreate, utilisateur_email: str, db: Session):
    utilisateur = db.query(Utilisateur).filter(Utilisateur.email == utilisateur_email).first()
    if not utilisateur:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")

    if transaction.taux_change_id:
        taux = db.query(TauxChange).filter(TauxChange.id == transaction.taux_change_id).first()
        if not taux:
            raise HTTPException(status_code=404, detail="Taux de change non trouvé.")

    nouvelle_transaction = Transaction(
        utilisateur_id=utilisateur.id,
        montant=transaction.montant,
        devise=transaction.devise,
        service=transaction.service,
        numero_transaction=transaction.numero_transaction,
        statut=transaction.statut or "en attente",
        taux_change_id=transaction.taux_change_id
    )

    db.add(nouvelle_transaction)
    db.commit()
    db.refresh(nouvelle_transaction)
    return nouvelle_transaction


# ✅ Lister les transactions selon le rôle
def lister_transactions(utilisateur_email: str, role: str, db: Session):
    role_norm = (role or "").lower()
    if role_norm in {"service", "superviseur", "admin", "supervisor"}:
        # Accès complet
        return db.query(Transaction).all()
    elif role_norm == "agent":
        # L'agent ne voit que les transactions en attente
        return db.query(Transaction).filter(Transaction.statut == "en attente").all()
    elif role_norm == "client":
        utilisateur = db.query(Utilisateur).filter(Utilisateur.email == utilisateur_email).first()
        if not utilisateur:
            raise HTTPException(status_code=404, detail="Utilisateur non trouvé.")
        return db.query(Transaction).filter(Transaction.utilisateur_id == utilisateur.id).all()
    else:
        raise HTTPException(status_code=403, detail="Rôle non autorisé à consulter les transactions.")


# ✅ Supprimer une transaction (client uniquement)
def supprimer_transaction(transaction_id: int, utilisateur_email: str, db: Session):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction non trouvée.")

    utilisateur = db.query(Utilisateur).filter(Utilisateur.email == utilisateur_email).first()
    if not utilisateur or transaction.utilisateur_id != utilisateur.id:
        raise HTTPException(status_code=403, detail="Non autorisé à supprimer cette transaction.")

    db.delete(transaction)
    db.commit()
    return {"message": "Transaction supprimée avec succès."}


# ✅ Modifier une transaction (client + statut "en attente")
def modifier_transaction(transaction_id: int, update_data: TransactionUpdate, utilisateur_email: str, db: Session):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction non trouvée.")

    utilisateur = db.query(Utilisateur).filter(Utilisateur.email == utilisateur_email).first()
    if not utilisateur or transaction.utilisateur_id != utilisateur.id:
        raise HTTPException(status_code=403, detail="Non autorisé à modifier cette transaction.")

    if transaction.statut != "en attente":
        raise HTTPException(status_code=400, detail="Transaction modifiable uniquement si en attente.")

    if update_data.taux_change_id:
        taux = db.query(TauxChange).filter(TauxChange.id == update_data.taux_change_id).first()
        if not taux:
            raise HTTPException(status_code=404, detail="Taux de change non trouvé.")

    for key, value in update_data.dict(exclude_unset=True).items():
        setattr(transaction, key, value)

    db.commit()
    db.refresh(transaction)
    return transaction


# ✅ Changer le statut (validation métier côté controller)
#    (Le contrôle d'autorisation 'seul superviseur/admin' est appliqué dans la route via require_one_of)
def changer_statut_transaction(transaction_id: int, statut: str, db: Session):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction non trouvée.")

    # Seules ces transitions sont permises ici
    if transaction.statut != "en attente":
        raise HTTPException(status_code=400, detail="Statut modifiable uniquement si la transaction est en attente.")

    valeurs_autorisees = {"validée", "annulée"}
    if statut not in valeurs_autorisees:
        raise HTTPException(status_code=400, detail="Statut invalide. Doit être 'validée' ou 'annulée'.")

    transaction.statut = statut
    db.commit()
    db.refresh(transaction)
    return transaction


# (Optionnel) ✅ Changer le statut par NUMÉRO de transaction
def changer_statut_transaction_par_numero(numero_transaction: str, statut: str, db: Session):
    transaction = db.query(Transaction).filter(Transaction.numero_transaction == numero_transaction).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction non trouvée.")

    if transaction.statut != "en attente":
        raise HTTPException(status_code=400, detail="Statut modifiable uniquement si la transaction est en attente.")

    valeurs_autorisees = {"validée", "annulée"}
    if statut not in valeurs_autorisees:
        raise HTTPException(status_code=400, detail="Statut invalide. Doit être 'validée' ou 'annulée'.")

    transaction.statut = statut
    db.commit()
    db.refresh(transaction)
    return transaction


# ✅ Supervision complète (retour aligné avec le frontend)
def tableau_de_bord_supervision(db: Session):
    # Agrégats
    total_par_service_raw = (
        db.query(Transaction.service, func.sum(Transaction.montant))
        .group_by(Transaction.service)
        .all()
    )
    total_par_devise_raw = (
        db.query(Transaction.devise, func.sum(Transaction.montant))
        .group_by(Transaction.devise)
        .all()
    )
    total_par_statut_raw = (
        db.query(Transaction.statut, func.count(Transaction.id))
        .group_by(Transaction.statut)
        .all()
    )

    # 🔁 Clés alignées avec le composant Supervision (montant_total)
    total_par_service = [
        {"service": service, "montant_total": float(total) if total else 0.0}
        for service, total in total_par_service_raw
    ]
    total_par_devise = [
        {"devise": devise, "montant_total": float(total) if total else 0.0}
        for devise, total in total_par_devise_raw
    ]
    total_par_statut = [
        {"statut": statut, "nombre": count}
        for statut, count in total_par_statut_raw
    ]

    # Transactions avec taux — inclure statut + date pour l'affichage
    transactions_avec_taux = (
        db.query(Transaction)
        .options(joinedload(Transaction.taux_change))
        .filter(Transaction.taux_change_id.isnot(None))
        .all()
    )

    tx_list = []
    for t in transactions_avec_taux:
        tx_list.append({
            "numero_transaction": t.numero_transaction,
            "montant": float(t.montant) if t.montant is not None else None,
            "devise": t.devise,
            "service": t.service,
            "statut": t.statut,
            "date_transaction": getattr(t, "date_transaction", None),
            "taux_change": t.taux_change.taux if getattr(t, "taux_change", None) else None
        })

    return {
        "total_par_service": total_par_service,
        "total_par_devise": total_par_devise,
        "total_par_statut": total_par_statut,
        "transactions_avec_taux": tx_list
    }
