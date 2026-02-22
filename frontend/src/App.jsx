import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';

// IMPORTS DES PAGES
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import History from './pages/History';

// NAVBAR
function Navbar() {
  const location = useLocation();

  const linkClass = (path) =>
    `px-4 py-2 rounded-lg font-medium transition-all ${
      location.pathname === path
        ? "bg-blue-600 text-white shadow-lg"
        : "text-gray-400 hover:text-white hover:bg-slate-800"
    }`;

  return (
    <nav className="bg-slate-800/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50 mb-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            CreditPath AI
          </div>
          <div className="flex space-x-2">
            <Link to="/" className={linkClass('/')}>Accueil</Link>
            <Link to="/dashboard" className={linkClass('/dashboard')}>Analyse Détaillée</Link>
            <Link to="/history" className={linkClass('/history')}>Historique</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {

  // ✅ FORMULAIRE VIDE (MODE PRO)
  const [formData, setFormData] = useState({
    revenu_mensuel: "",
    dette_totale: "",
    anciennete_emploi: "",
    epargne: "",
    montant_demande: "",
    duree_pret: ""
  });

  const [result, setResult] = useState(() => {
    const saved = localStorage.getItem("lastResult");
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  // Sauvegarde dernier résultat
  useEffect(() => {
    if (result) {
      localStorage.setItem("lastResult", JSON.stringify(result));
    }
  }, [result]);

  // Charger l’historique
  useEffect(() => {
    fetch('http://127.0.0.1:8000/history')
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(err => console.error(err));
  }, []);

  // Gestion des inputs
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Envoi au backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revenu_mensuel: Number(formData.revenu_mensuel),
          dette_totale: Number(formData.dette_totale),
          anciennete_emploi: Number(formData.anciennete_emploi),
          epargne: Number(formData.epargne),
          montant_demande: Number(formData.montant_demande),
          duree_pret: Number(formData.duree_pret)
        })
      });

      if (!res.ok) throw new Error("Erreur serveur");

      const data = await res.json();
      setResult(data);

      // Recharger l’historique
      const h = await fetch('http://127.0.0.1:8000/history');
      setHistory(await h.json());

      alert("Analyse terminée ! Consulte l'onglet Analyse Détaillée.");

    } catch (err) {
      alert("Erreur serveur !");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-900 font-sans text-gray-100">
        <Navbar />

        <div className="max-w-6xl mx-auto px-4 pb-10">
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  formData={formData}
                  handleChange={handleChange}
                  handleSubmit={handleSubmit}
                  loading={loading}
                  result={result}
                />
              }
            />
            <Route
              path="/dashboard"
              element={<Dashboard result={result} formData={formData} />}
            />
            <Route
              path="/history"
              element={<History history={history} />}
            />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;