from sqlalchemy.orm import Session
from models import Transaction
from datetime import datetime, timedelta
from sqlalchemy import func


def detecter_alertes(db: Session, seuil_montant: float = 10000.0, delai_minutes: int = 5):
    alertes = []

    # 1. Transactions au-dessus du seuil
    transactions_suspectes = db.query(Transaction).filter(Transaction.montant >= seuil_montant).all()
    if transactions_suspectes:
        alertes.append({
            "type": "Montant élevé",
            "transactions": [t.__dict__ for t in transactions_suspectes]
        })

    # 2. Transactions multiples en peu de temps par utilisateur
    limite_temps = datetime.utcnow() - timedelta(minutes=delai_minutes)
    transactions_recent = db.query(Transaction.utilisateur_id, func.count(Transaction.id))\
        .filter(Transaction.date_transaction >= limite_temps)\
        .group_by(Transaction.utilisateur_id)\
        .having(func.count(Transaction.id) > 3)\
        .all()

    if transactions_recent:
        alertes.append({
            "type": "Transactions multiples dans un court délai",
            "details": [{"utilisateur_id": utilisateur_id, "nb_transactions": nb} for utilisateur_id, nb in transactions_recent]
        })

    return alertes
