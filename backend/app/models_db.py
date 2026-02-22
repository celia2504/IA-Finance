from sqlalchemy import Column, Integer, String, Float, DateTime
from .database import Base
import datetime

class LoanPrediction(Base):
    __tablename__ = "loan_history"

    id = Column(Integer, primary_key=True, index=True)
    revenu_mensuel = Column(Float)
    dette_totale = Column(Float)
    montant_demande = Column(Float)
    duree_pret = Column(Integer)
    
    # Résultat de l'IA
    decision = Column(String) # ACCORDÉ ou REFUSÉ
    score_confiance = Column(Float)
    
    date_simulation = Column(DateTime, default=datetime.datetime.utcnow)