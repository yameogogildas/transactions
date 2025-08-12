from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from models import Transaction
from typing import Dict

def tableau_de_bord_supervision(db: Session) -> Dict:
    # 🔹 Total par service
    total_par_service_raw = db.query(
        Transaction.service,
        func.sum(Transaction.montant)
    ).group_by(Transaction.service).all()

    total_par_service = [
        {"service": service, "total": float(total) if total else 0.0}
        for service, total in total_par_service_raw
    ]

    # 🔹 Total par devise
    total_par_devise_raw = db.query(
        Transaction.devise,
        func.sum(Transaction.montant)
    ).group_by(Transaction.devise).all()

    total_par_devise = [
        {"devise": devise, "total": float(total) if total else 0.0}
        for devise, total in total_par_devise_raw
    ]

    # 🔹 Total par statut
    total_par_statut_raw = db.query(
        Transaction.statut,
        func.count(Transaction.id)
    ).group_by(Transaction.statut).all()

    total_par_statut = [
        {"statut": statut, "nombre": count}
        for statut, count in total_par_statut_raw
    ]

    # 🔹 Transactions avec taux de change
    transactions_avec_taux = db.query(Transaction)\
        .options(joinedload(Transaction.taux_change))\
        .filter(Transaction.taux_change_id.isnot(None))\
        .filter(Transaction.taux_change != None)\
        .all()

    transactions_details = []
    for t in transactions_avec_taux:
        transactions_details.append({
            "numero_transaction": t.numero_transaction,
            "montant": t.montant,
            "devise": t.devise,
            "service": t.service,
            "taux_change": t.taux_change.taux if t.taux_change else None
        })

    return {
        "total_par_service": total_par_service,
        "total_par_devise": total_par_devise,
        "total_par_statut": total_par_statut,
        "transactions_avec_taux": transactions_details
    }
