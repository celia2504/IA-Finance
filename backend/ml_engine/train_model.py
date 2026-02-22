import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report
import joblib

print("📥 Téléchargement du Dataset 'German Credit Data'...")

# 1. CHARGEMENT DE VRAIES DONNÉES (Source OpenML)
# Ce dataset contient 1000 vrais dossiers de crédit
url = "https://raw.githubusercontent.com/jbrownlee/Datasets/master/german.csv"
# Les colonnes ne sont pas nommées dans le raw, on les définit :
names = ['checking_status', 'duration', 'credit_history', 'purpose', 'credit_amount', 'savings', 'employment', 'installment_rate', 'status', 'debtors', 'residence', 'property', 'age', 'plans', 'housing', 'existing_credits', 'job', 'dependents', 'telephone', 'foreign', 'label']
df = pd.read_csv(url, names=names, delimiter=',')

print("✅ Données téléchargées. Transformation en cours...")

# 2. ADAPTATION AUX INPUTS DE TON SITE
# Ton site demande : Revenu, Dettes, Ancienneté, Épargne, Montant, Durée.
# Le dataset allemand est un peu différent, on va mapper les colonnes intelligemment.

# On crée un DataFrame propre qui ressemble à ton formulaire
data = pd.DataFrame()

# MAPPING (Transformation des données réelles pour ton formulaire)
# Le dataset n'a pas "Revenu" explicite, on va le simuler proportionnellement au montant du crédit et au taux
# C'est une approximation nécessaire pour garder ton formulaire actuel.
data['revenu_mensuel'] = df['credit_amount'] / 4  + np.random.normal(1500, 500, 1000) # Simulation réaliste
data['dette_totale'] = df['credit_amount'] * 0.5 # On suppose qu'ils ont d'autres dettes
data['anciennete_emploi'] = df['employment'].replace({'A71': 0, 'A72': 1, 'A73': 4, 'A74': 7, 'A75': 10}) # Codes du dataset décodés
data['epargne'] = df['savings'].replace({'A61': 100, 'A62': 500, 'A63': 1000, 'A64': 5000, 'A65': 0})
data['montant_demande'] = df['credit_amount']
data['duree_pret'] = df['duration']

# La cible : 1 = Bon, 2 = Mauvais dans le dataset original.
# On transforme en : 1 = Accordé, 0 = Refusé
data['accord_credit'] = df['label'].apply(lambda x: 1 if x == 1 else 0)

# Nettoyage
data = data.fillna(0)
data[data < 0] = 0

# 3. ENTRAÎNEMENT
X = data.drop('accord_credit', axis=1)
y = data['accord_credit']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("🧠 Entraînement du modèle sur les données réelles...")
model = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42)
model.fit(X_train, y_train)

# 4. ÉVALUATION
y_pred = model.predict(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"🎯 Précision sur données réelles : {acc:.2f}")

# 5. SAUVEGARDE
joblib.dump(model, 'credit_model.pkl')
print("💾 Nouveau modèle 'Pro' sauvegardé sous 'credit_model.pkl'")