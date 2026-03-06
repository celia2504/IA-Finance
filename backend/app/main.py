from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
import joblib
import pandas as pd
import os

# Import BDD
from .database import SessionLocal, engine
from . import models_db

# Configuration Sécurité
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# --- MODÈLES ---
class UserCreate(BaseModel):
    email: str
    password: str
    nom: str
    prenom: str

class UserLogin(BaseModel):
    email: str
    password: str

class CreditRequest(BaseModel):
    user_id: int # <--- NOUVEAU : On a besoin de savoir QUI fait la demande
    revenu_mensuel: float
    dette_totale: float
    anciennete_emploi: int
    epargne: float
    montant_demande: float
    duree_pret: int

class ChatRequest(BaseModel):
    message: str
    context: dict 

models_db.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CreditPath AI API")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "ml_engine", "credit_model.pkl")
try: model = joblib.load(MODEL_PATH)
except: model = None

# --- AUTHENTIFICATION ---
@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models_db.User).filter(models_db.User.email == user.email).first()
    if existing: raise HTTPException(status_code=400, detail="Email déjà utilisé.")
    hashed_pw = pwd_context.hash(user.password)
    new_user = models_db.User(email=user.email, hashed_password=hashed_pw, nom=user.nom, prenom=user.prenom)
    db.add(new_user)
    db.commit()
    return {"message": "Compte créé."}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models_db.User).filter(models_db.User.email == user.email).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Identifiants incorrects.")
    return {"message": "OK", "user_id": db_user.id, "nom": db_user.nom} # On renvoie l'ID

# --- LOGIQUE ---
def generer_conseils(data, decision, score):
    conseils = []
    revenu = data.get('revenu_mensuel', 0)
    dette = data.get('dette_totale', 0)
    epargne = data.get('epargne', 0)
    montant = data.get('montant_demande', 0)
    if revenu > 0: ratio = dette / (revenu * 12)
    else: ratio = 0
    if ratio > 0.33: conseils.append(f"⚠️ **Surendettement :** Ratio de {round(ratio*100)}%.")
    if epargne < (montant * 0.1): conseils.append("📉 **Apport faible :** Visez 10%.")
    if decision == "ACCORDÉ": conseils.append("💎 **Dossier Solide :** Négociez le taux !")
    if decision == "REFUSÉ" and not conseils: conseils.append("🔍 **Profil Risqué :** Allongez la durée.")
    return conseils

def calculer_amortissement(montant, taux_annuel, duree_mois):
    if duree_mois == 0: return [], 0, 0
    taux_m = taux_annuel / 12 / 100
    try: mens = (montant * taux_m) / (1 - (1 + taux_m) ** -duree_mois)
    except: mens = 0
    tab, rest, total = [], montant, 0
    for m in range(1, duree_mois + 1):
        inte = rest * taux_m
        princ = mens - inte
        rest -= princ
        total += inte
        tab.append({"mois": m, "mensualite": round(mens, 2), "interet": round(inte, 2), "principal": round(princ, 2), "restant": round(max(0, rest), 2)})
    return tab, round(mens, 2), round(total, 2)

@app.post("/predict")
def predict_credit(request: CreditRequest, db: Session = Depends(get_db)):
    if not model: return {"error": "Service indisponible"}
    
    # On prépare les données pour l'IA (on retire le user_id car l'IA ne le connait pas)
    data_dict = request.dict()
    user_id = data_dict.pop('user_id') # On extrait l'ID
    
    input_data = pd.DataFrame([data_dict])
    if hasattr(model, "feature_names_in_"): input_data = input_data[model.feature_names_in_]

    prediction = model.predict(input_data)[0]
    prob = model.predict_proba(input_data)[0][1]
    decision = "ACCORDÉ" if prediction == 1 else "REFUSÉ"
    score = round(prob * 100, 2)
    
    taux = round(max(2.5, 6.0 - (score / 20)), 2)
    amort, mens, cout = calculer_amortissement(request.montant_demande, taux, request.duree_pret)
    _, _, cout_marche = calculer_amortissement(request.montant_demande, 4.90, request.duree_pret)
    
    # ON SAUVEGARDE AVEC LE USER_ID
    db_record = models_db.LoanPrediction(
        user_id=user_id, # <--- ICI LE LIEN
        revenu_mensuel=request.revenu_mensuel, dette_totale=request.dette_totale, montant_demande=request.montant_demande, duree_pret=request.duree_pret, decision=decision, score_confiance=score
    )
    db.add(db_record)
    db.commit()
    
    return {"decision": decision, "score_confiance": score, "plan_action": generer_conseils(request.dict(), decision, score), "finance": {"taux_obtenu": taux, "taux_marche": 4.90, "mensualite": mens, "cout_total": cout, "economie": round(cout_marche - cout, 2), "tableau_amortissement": amort}}

# --- ROUTE HISTORIQUE FILTRÉE ---
@app.get("/history/{user_id}") # On demande l'historique d'un ID précis
def get_history(user_id: int, db: Session = Depends(get_db)):
    return db.query(models_db.LoanPrediction).filter(models_db.LoanPrediction.user_id == user_id).order_by(models_db.LoanPrediction.id.desc()).limit(10).all()

@app.post("/chat")
def chat(request: ChatRequest):
    return {"response": "Utilisez les boutons pour interagir."}