from fastapi import HTTPException
from sqlalchemy.orm import Session
from models import TauxChange
from schemas import TauxChangeCreate
from datetime import datetime


# ✅ Créer un taux de change avec validations solides
def creer_taux_change(taux_data: TauxChangeCreate, db: Session):
    source = taux_data.devise_source.strip().upper()
    cible = taux_data.devise_cible.strip().upper()

    if source == cible:
        raise HTTPException(status_code=400, detail="Les devises source et cible doivent être différentes.")

    if taux_data.taux <= 0:
        raise HTTPException(status_code=400, detail="Le taux doit être strictement supérieur à 0.")

    existant = db.query(TauxChange).filter(
        TauxChange.devise_source == source,
        TauxChange.devise_cible == cible
    ).first()

    if existant:
        raise HTTPException(status_code=409, detail="Ce taux de change existe déjà.")

    nouveau_taux = TauxChange(
        devise_source=source,
        devise_cible=cible,
        taux=taux_data.taux,
        date_enregistrement=datetime.utcnow()
    )
    db.add(nouveau_taux)
    db.commit()
    db.refresh(nouveau_taux)
    return nouveau_taux


# ✅ Lister tous les taux de change
def lister_taux_change(db: Session):
    taux_list = db.query(TauxChange).order_by(TauxChange.date_enregistrement.desc()).all()
    if not taux_list:
        raise HTTPException(status_code=404, detail="Aucun taux de change disponible.")
    return taux_list


# ✅ Mettre à jour un taux existant avec validation
def mettre_a_jour_taux(taux_id: int, taux_data: TauxChangeCreate, db: Session):
    source = taux_data.devise_source.strip().upper()
    cible = taux_data.devise_cible.strip().upper()

    if source == cible:
        raise HTTPException(status_code=400, detail="Les devises source et cible doivent être différentes.")

    if taux_data.taux <= 0:
        raise HTTPException(status_code=400, detail="Le taux doit être strictement supérieur à 0.")

    taux = db.query(TauxChange).filter(TauxChange.id == taux_id).first()
    if not taux:
        raise HTTPException(status_code=404, detail="Taux de change non trouvé.")

    taux.devise_source = source
    taux.devise_cible = cible
    taux.taux = taux_data.taux
    taux.date_enregistrement = datetime.utcnow()

    db.commit()
    db.refresh(taux)
    return taux


# ✅ Supprimer un taux existant
def supprimer_taux(taux_id: int, db: Session):
    taux = db.query(TauxChange).filter(TauxChange.id == taux_id).first()
    if not taux:
        raise HTTPException(status_code=404, detail="Taux de change non trouvé.")

    db.delete(taux)
    db.commit()
    return {"message": "Taux de change supprimé avec succès."}
