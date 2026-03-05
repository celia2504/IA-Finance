from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
import joblib
import pandas as pd
import os
import random

# Import BDD
from .database import SessionLocal, engine
from . import models_db

# Configuration Sécurité (Hashage mot de passe)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# --- MODÈLES ---
class UserCreate(BaseModel):
    email: str
    password: str
    nom: str     # Nouveau
    prenom: str  # Nouveau

class UserLogin(BaseModel):
    email: str
    password: str

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

# Création des tables
models_db.Base.metadata.create_all(bind=engine)

app = FastAPI(title="CreditPath AI API")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# Chargement IA
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "ml_engine", "credit_model.pkl")
try: model = joblib.load(MODEL_PATH)
except: model = None

# --- AUTHENTIFICATION ---

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    # 1. Vérifier si l'email existe
    existing_user = db.query(models_db.User).filter(models_db.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")
    
    # 2. Hasher le mot de passe
    hashed_pw = pwd_context.hash(user.password)
    
    # 3. Créer l'utilisateur AVEC Nom et Prénom
    new_user = models_db.User(
        email=user.email, 
        hashed_password=hashed_pw,
        nom=user.nom,
        prenom=user.prenom
    )
    
    db.add(new_user)
    db.commit()
    return {"message": "Compte créé avec succès."}

@app.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models_db.User).filter(models_db.User.email == user.email).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Identifiants incorrects.")
    
    if not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Identifiants incorrects.")
    
    return {"message": "Connexion autorisée", "user_id": db_user.id}

# --- FONCTIONS MÉTIER ---

def generer_conseils(data, decision, score):
    conseils = []
    
    # Récupération sécurisée des données
    revenu = float(data.get('revenu_mensuel') or 0)
    dette = float(data.get('dette_totale') or 0)
    epargne = float(data.get('epargne') or 0)
    montant = float(data.get('montant_demande') or 0)
    duree = int(data.get('duree_pret') or 0)
    
    # Calcul du ratio
    revenu_annuel = revenu * 12
    if revenu_annuel > 0:
        ratio_dette = dette / revenu_annuel
    else:
        ratio_dette = 0
    
    # --- ANALYSE DÉTAILLÉE ---

    # 1. Analyse de l'Endettement
    if ratio_dette > 0.35:
        conseils.append(f"⚠️ **Surendettement critique :** Votre ratio d'endettement est de {round(ratio_dette*100)}%, bien au-dessus de la limite des 35%. **Action recommandée :** Il est impératif de solder vos crédits consommation en cours avant de solliciter un emprunt immobilier.")
    elif ratio_dette > 0.30:
        conseils.append(f"⚠️ **Endettement élevé :** Vous approchez du plafond de verre des 33%. **Stratégie :** Essayez d'augmenter la durée du prêt pour réduire mécaniquement votre taux d'effort mensuel.")

    # 2. Analyse de l'Apport (C'était ton "Personnel insuffisant")
    apport_recommande = montant * 0.10
    if epargne < (montant * 0.05):
        conseils.append(f" **Apport personnel très faible :** Vous disposez de moins de 5% du montant. Les banques demandent généralement de couvrir au moins les frais de notaire (environ 8-10%). **Conseil :** Constituez une épargne de précaution avant de relancer le projet.")
    elif epargne < apport_recommande:
        conseils.append(f" **Apport personnel juste :** Votre épargne couvre moins de 10% du projet. **Conseil :** Injecter {int(apport_recommande - epargne)}€ supplémentaires rassurerait considérablement la banque.")

    # 3. Analyse de la Durée
    if duree < 120 and montant > 50000: # Si gros montant sur moins de 10 ans
        conseils.append(" **Durée trop courte :** Rembourser ce montant sur une si courte période alourdit vos mensualités inutilement. **Stratégie :** Étalez la dette sur une période plus longue (ex: +5 ans) pour gagner en 'Reste à Vivre'.")

    # 4. Analyse Positive (Si accordé)
    if decision == "ACCORDÉ":
        if score > 80:
            conseils.append(" **Profil Premium :** Votre dossier est excellent. Vous êtes en position de force pour **négocier le taux** (visez 0.2% sous le marché) ou demander l'exonération des frais de dossier.")
        else:
            conseils.append(" **Dossier Validé :** Le financement est possible. Pour optimiser l'offre, mettez en avant la stabilité de vos revenus professionnels.")

    # 5. Fallback (Si aucune règle ne s'applique mais que c'est refusé)
    if decision == "REFUSÉ" and len(conseils) == 0:
        conseils.append(" **Analyse complexe :** Bien qu'aucun indicateur ne soit rouge vif, l'accumulation de petits facteurs (ancienneté, secteur d'activité) pèse sur le score. Essayez de présenter un co-emprunteur.")

    return conseils

def calculer_amortissement(montant, taux_annuel, duree_mois):
    if duree_mois == 0: return [], 0, 0
    taux_mensuel = taux_annuel / 12 / 100
    try: mensualite = (montant * taux_mensuel) / (1 - (1 + taux_mensuel) ** -duree_mois)
    except: mensualite = 0
    tableau = []
    restant = montant
    cout_total = 0
    for mois in range(1, duree_mois + 1):
        interet = restant * taux_mensuel
        principal = mensualite - interet
        restant -= principal
        cout_total += interet
        tableau.append({"mois": mois, "mensualite": round(mensualite, 2), "interet": round(interet, 2), "principal": round(principal, 2), "restant": round(max(0, restant), 2)})
    return tableau, round(mensualite, 2), round(cout_total, 2)

@app.post("/predict")
def predict_credit(request: CreditRequest, db: Session = Depends(get_db)):
    if not model: return {"error": "Service indisponible"}
    input_data = pd.DataFrame([request.dict()])
    prediction = model.predict(input_data)[0]
    probability = model.predict_proba(input_data)[0][1]
    decision = "ACCORDÉ" if prediction == 1 else "REFUSÉ"
    score_percent = round(probability * 100, 2)
    
    taux_utilisateur = round(max(2.5, 6.0 - (score_percent / 20)), 2)
    amortissement, mensualite, cout_credit = calculer_amortissement(request.montant_demande, taux_utilisateur, request.duree_pret)
    _, _, cout_marche = calculer_amortissement(request.montant_demande, 4.90, request.duree_pret)
    
    db_record = models_db.LoanPrediction(
        revenu_mensuel=request.revenu_mensuel, dette_totale=request.dette_totale, montant_demande=request.montant_demande, duree_pret=request.duree_pret, decision=decision, score_confiance=score_percent
    )
    db.add(db_record)
    db.commit()
    
    return {"decision": decision, "score_confiance": score_percent, "plan_action": generer_conseils(request.dict(), decision, score_percent), "finance": {"taux_obtenu": taux_utilisateur, "taux_marche": 4.90, "mensualite": mensualite, "cout_total": cout_credit, "economie": round(cout_marche - cout_credit, 2), "tableau_amortissement": amortissement}}

@app.get("/history")
def get_history(db: Session = Depends(get_db)):
    return db.query(models_db.LoanPrediction).order_by(models_db.LoanPrediction.id.desc()).limit(5).all()

@app.post("/chat")
def chat_with_ai(request: ChatRequest):
    user_msg = request.message.lower()
    data = request.context or {}
    decision = data.get('decision', 'INCONNU')
    
    # Message par défaut si rien ne matche
    response = "Je ne comprends pas la demande. Veuillez utiliser les boutons suggérés."

    # 1. ANALYSE / POURQUOI (Bouton: "Analyse du résultat")
    if any(x in user_msg for x in ["pourquoi", "raison", "refus", "analyse", "résultat"]):
        revenu = float(data.get('revenu_mensuel') or 0)
        dette = float(data.get('dette_totale') or 0)
        montant = float(data.get('montant_demande') or 0)
        epargne = float(data.get('epargne') or 0)

        if revenu > 0:
            ratio = dette / (revenu * 12)
            if ratio > 0.33: 
                response = f"L'analyse révèle un taux d'endettement de {round(ratio*100)}%, supérieur au seuil de 33%. C'est le facteur bloquant principal."
            elif epargne < (montant * 0.1):
                response = "L'épargne est insuffisante. Les banques exigent généralement un apport couvrant 10% du montant (frais annexes)."
            else:
                response = "La combinaison durée/montant semble déséquilibrée. Le reste à vivre calculé est trop faible."
        else:
            response = "Les données financières sont incomplètes pour fournir une analyse précise."

    # 2. CONSEILS (Bouton: "Conseils d'amélioration")
    elif any(x in user_msg for x in ["conseil", "amélioration", "comment", "solution"]):
        duree = int(data.get('duree_pret') or 0)
        if duree < 25 * 12: # Moins de 25 ans
            response = "Stratégie recommandée : Allongez la durée du prêt pour réduire mécaniquement les mensualités et le taux d'effort."
        else:
            response = "Stratégie recommandée : Soldez les petits crédits à la consommation en cours ou augmentez votre apport via une épargne programmée."

    # 3. ÉLIGIBILITÉ (Bouton: "Statut d'éligibilité")
    elif any(x in user_msg for x in ["eligible", "éligible", "statut"]):
        if decision == "ACCORDÉ": 
            response = "Statut : ÉLIGIBLE. Le dossier respecte les critères de solvabilité actuels."
        elif decision == "REFUSÉ": 
            response = "Statut : NON ÉLIGIBLE en l'état. Le niveau de risque dépasse les normes d'acceptation."
        else: 
            response = "Statut : EN ATTENTE. Veuillez lancer une simulation."

    # 4. TAUX (Bouton: "Taux actuels")
    elif any(x in user_msg for x in ["taux", "intérêts"]): 
        response = "Indicateur marché : Le taux moyen pour ce profil est actuellement estimé à 4.10% (hors assurance)."

    # 5. SALUTATIONS
    elif any(x in user_msg for x in ["bonjour", "salut", "hello"]): 
        response = "Bonjour. Je suis l'assistant virtuel CreditPath. Sélectionnez une option pour démarrer."
    
    return {"response": response}