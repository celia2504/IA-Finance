from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
import joblib
import pandas as pd
import os
import random # Pour varier les réponses du bot

# Import de la base de données
from .database import SessionLocal, engine
from . import models_db

# --- DÉFINITION DES MODÈLES ---
class CreditRequest(BaseModel):
    revenu_mensuel: float
    dette_totale: float
    anciennete_emploi: int
    epargne: float
    montant_demande: float
    duree_pret: int

class ChatRequest(BaseModel):
    message: str
    context: dict 

# Création automatique des tables
models_db.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CreditPath AI API")

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# --- CHARGEMENT DU MODÈLE IA ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "ml_engine", "credit_model.pkl")
try:
    model = joblib.load(MODEL_PATH)
    print("✅ Modèle IA chargé.")
except:
    model = None
    print("❌ Modèle non trouvé.")

# --- FONCTIONS LOGIQUES ---
def generer_conseils(data, decision, score):
    conseils = []
    revenu = data.get('revenu_mensuel', 0)
    dette = data.get('dette_totale', 0)
    
    if revenu > 0:
        ratio_dette = dette / (revenu * 12)
    else:
        ratio_dette = 0
    
    if ratio_dette > 0.4:
        conseils.append("⚠️ Ratio d'endettement critique (> 40%). Réduisez vos dettes.")
    elif ratio_dette > 0.33:
        conseils.append("⚠️ Ratio d'endettement élevé. Attention au surendettement.")
        
    return conseils

def calculer_amortissement(montant, taux_annuel, duree_mois):
    if duree_mois == 0: return [], 0, 0
    taux_mensuel = taux_annuel / 12 / 100
    try:
        mensualite = (montant * taux_mensuel) / (1 - (1 + taux_mensuel) ** -duree_mois)
    except:
        mensualite = 0

    tableau = []
    restant = montant
    cout_total = 0

    for mois in range(1, duree_mois + 1):
        interet = restant * taux_mensuel
        principal = mensualite - interet
        restant -= principal
        cout_total += interet
        tableau.append({
            "mois": mois, "mensualite": round(mensualite, 2),
            "interet": round(interet, 2), "principal": round(principal, 2),
            "restant": round(max(0, restant), 2)
        })
    return tableau, round(mensualite, 2), round(cout_total, 2)


# --- ROUTES API ---
@app.post("/predict")
def predict_credit(request: CreditRequest, db: Session = Depends(get_db)):
    if not model: return {"error": "Modèle manquant"}

    input_data = pd.DataFrame([request.dict()])
    prediction = model.predict(input_data)[0]
    probability = model.predict_proba(input_data)[0][1]
    
    decision = "ACCORDÉ" if prediction == 1 else "REFUSÉ"
    score_percent = round(probability * 100, 2)

    taux_marche = 4.90
    taux_utilisateur = round(max(2.5, 6.0 - (score_percent / 20)), 2)
    
    amortissement, mensualite, cout_credit = calculer_amortissement(request.montant_demande, taux_utilisateur, request.duree_pret)
    _, _, cout_marche = calculer_amortissement(request.montant_demande, taux_marche, request.duree_pret)
    economie = round(cout_marche - cout_credit, 2)

    db_record = models_db.LoanPrediction(
        revenu_mensuel=request.revenu_mensuel, dette_totale=request.dette_totale,
        montant_demande=request.montant_demande, duree_pret=request.duree_pret,
        decision=decision, score_confiance=score_percent
    )
    db.add(db_record)
    db.commit()

    plan = generer_conseils(request.dict(), decision, score_percent)
    
    return {
        "decision": decision, "score_confiance": score_percent,
        "plan_action": plan,
        "finance": {
            "taux_obtenu": taux_utilisateur, "taux_marche": taux_marche,
            "mensualite": mensualite, "cout_total": cout_credit, "economie": economie,
            "tableau_amortissement": amortissement
        }
    }

@app.get("/history")
def get_history(db: Session = Depends(get_db)):
    return db.query(models_db.LoanPrediction).order_by(models_db.LoanPrediction.id.desc()).limit(5).all()

# --- LE CHATBOT "SYSTÈME EXPERT" (SANS CLÉ API - FONCTIONNE TOUJOURS) ---
@app.post("/chat")
def chat_with_ai(request: ChatRequest):
    user_msg = request.message.lower()
    
    # Données avec sécurité (valeur 0 par défaut)
    data = request.context or {}
    revenu = float(data.get('revenu_mensuel') or 0)
    dette = float(data.get('dette_totale') or 0)
    epargne = float(data.get('epargne') or 0)
    montant = float(data.get('montant_demande') or 0)
    duree = int(data.get('duree_pret') or 0)
    decision = data.get('decision', 'INCONNU')

    response = ""

    # 1. QUESTION SUR LE RÉSULTAT / POURQUOI
    if any(x in user_msg for x in ["pourquoi", "raison", "refus", "résultat", "analyse"]):
        if revenu > 0:
            ratio = dette / (revenu * 12)
            if ratio > 0.33:
                response = f"J'ai analysé vos chiffres : votre taux d'endettement est de {round(ratio*100)}%. C'est trop élevé (max 33%). C'est la raison principale du blocage."
            elif epargne < (montant * 0.1):
                response = f"Votre épargne ({epargne}€) est trop faible par rapport au montant demandé ({montant}€). Les banques demandent souvent 10% d'apport."
            else:
                response = "C'est une question de durée. Pour un tel montant, la durée de remboursement est trop courte, ce qui augmente trop vos mensualités."
        else:
            response = "Je ne peux pas analyser votre dossier car les revenus sont à zéro. Veuillez refaire une simulation complète."

    # 2. QUESTION SUR L'ÉLIGIBILITÉ
    elif any(x in user_msg for x in ["eligible", "éligible", "statut"]):
        if decision == "ACCORDÉ":
            response = "Bonne nouvelle ! ✅ D'après mes algorithmes, votre profil est éligible au crédit bancaire."
        elif decision == "REFUSÉ":
            response = "Pour l'instant, le dossier présente trop de risques (endettement ou épargne). Regardez mes conseils pour améliorer ça."
        else:
            response = "Faites d'abord une simulation pour que je vous réponde."

    # 3. QUESTION SUR LES CONSEILS / AMÉLIORATION
    elif any(x in user_msg for x in ["comment", "améliorer", "conseil", "solution", "faire"]):
        if duree < 60:
            response = "💡 Mon meilleur conseil : Augmentez la durée du prêt (par exemple +12 mois). Cela réduira vos mensualités mécaniquement."
        else:
            response = "💡 Mon conseil : Essayez de solder un petit crédit en cours ou d'augmenter votre apport personnel."

    # 4. QUESTION SUR LES TAUX
    elif any(x in user_msg for x in ["taux", "intérêts", "combien"]):
        response = "📈 Actuellement, pour un profil comme le vôtre, le taux moyen du marché se situe autour de 4.10%. C'est un taux standard."

    # 5. SALUTATIONS / GÉNÉRAL
    elif any(x in user_msg for x in ["bonjour", "salut", "hello", "ça va"]):
        intro = ["Bonjour !", "Salutations !", "Hello !"][random.randint(0, 2)]
        response = f"{intro} Je suis FinAdvisor. Je suis prêt à analyser votre dossier financier."

    # 6. RÉPONSE PAR DÉFAUT (SI INCOMPRIS)
    else:
        response = "Je suis une IA spécialisée en analyse de crédit. Cliquez sur les boutons 'Suggestions' pour que je puisse vous répondre précisément !"

    return {"response": response}