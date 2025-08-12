from sqlalchemy import (
    Column, Integer, String, ForeignKey,
    DateTime, Float, UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

# -------------------- Utilisateur --------------------

class Utilisateur(Base):
    __tablename__ = "utilisateurs"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    mot_de_passe = Column(String(255), nullable=False)
    role = Column(String(20), default="client")

    transactions = relationship("Transaction", back_populates="utilisateur", cascade="all, delete")

    def __repr__(self):
        return f"<Utilisateur {self.id} - {self.email}>"

# -------------------- Taux de Change --------------------

class TauxChange(Base):
    __tablename__ = "taux_changes"
    __table_args__ = (
        UniqueConstraint('devise_source', 'devise_cible', name='uix_devises'),
        CheckConstraint('taux > 0', name='check_taux_positif'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    devise_source = Column(String(10), nullable=False)
    devise_cible = Column(String(10), nullable=False)
    taux = Column(Float, nullable=False)
    date_enregistrement = Column(DateTime, default=datetime.utcnow)

    transactions = relationship("Transaction", back_populates="taux_change", cascade="all, delete")

    def __repr__(self):
        return f"<TauxChange {self.devise_source}->{self.devise_cible}: {self.taux}>"

# -------------------- Transaction --------------------

class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    utilisateur_id = Column(Integer, ForeignKey('utilisateurs.id'), nullable=False)
    montant = Column(Float, nullable=False)
    devise = Column(String(10), nullable=False)
    service = Column(String(50), nullable=False)  # Western Union, RIA, etc.
    numero_transaction = Column(String(100), unique=True, nullable=False)
    statut = Column(String(20), default="en attente")  # en attente, validée, annulée
    date_transaction = Column(DateTime, default=datetime.utcnow)

    taux_change_id = Column(Integer, ForeignKey('taux_changes.id'), nullable=True)

    utilisateur = relationship("Utilisateur", back_populates="transactions")
    taux_change = relationship("TauxChange", back_populates="transactions")
    alertes = relationship("Alerte", back_populates="transaction", cascade="all, delete")

    def __repr__(self):
        return (
            f"<Transaction {self.id} - {self.service} - {self.montant} {self.devise} "
            f"Statut: {self.statut}>"
        )

# -------------------- Alerte --------------------

class Alerte(Base):
    __tablename__ = "alertes"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(Integer, ForeignKey('transactions.id'), nullable=False)
    motif = Column(String(255), nullable=False)
    date_alerte = Column(DateTime, default=datetime.utcnow)

    transaction = relationship("Transaction", back_populates="alertes")

    def __repr__(self):
        return f"<Alerte {self.id} - TX {self.transaction_id}>"
