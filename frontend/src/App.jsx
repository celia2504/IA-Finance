import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Login from './pages/Login';      // <--- NOUVEAU
import Register from './pages/Register'; // <--- NOUVEAU

// --- SIDEBAR (S'affiche seulement si connecté) ---
function Sidebar({ onLogout }) {
  const location = useLocation();
  const menuItems = [
    { path: '/', label: 'Nouvelle Simulation', icon: 'M12 4.5v15m7.5-7.5h-15' },
    { path: '/dashboard', label: 'Analyse Détaillée', icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
    { path: '/history', label: 'Historique', icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' }
  ];

  return (
    <div className="w-64 h-screen fixed left-0 top-0 glass-panel border-r border-white/10 flex flex-col z-50">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold tracking-wider text-white">CREDIT<span className="text-blue-500">PATH</span></h1>
      </div>
      
      <nav className="flex-1 py-6 px-3 space-y-2">
        {menuItems.map((item) => (
          <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${location.pathname === item.path ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-6 border-t border-white/10">
        <button onClick={onLogout} className="flex items-center gap-2 text-rose-400 hover:text-rose-300 text-sm font-bold w-full">
           <span>🚪</span> Se déconnecter
        </button>
      </div>
    </div>
  );
}

function App() {
  // GESTION DE LA CONNEXION
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    setIsAuthenticated(false);
  };

  const [formData, setFormData] = useState({ revenu_mensuel: "", dette_totale: "", anciennete_emploi: "", epargne: "", montant_demande: "", duree_pret: "" });
  const [result, setResult] = useState(() => { const s = localStorage.getItem("lastResult"); return s ? JSON.parse(s) : null; });
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => { if (result) localStorage.setItem("lastResult", JSON.stringify(result)); }, [result]);
  useEffect(() => { fetch('http://127.0.0.1:8000/history').then(r => r.json()).then(setHistory).catch(console.error); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: parseFloat(e.target.value) || 0 });
  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setResult(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (!res.ok) throw new Error("Err");
      const data = await res.json();
      setResult(data);
      fetch('http://127.0.0.1:8000/history').then(r => r.json()).then(setHistory);
    } catch (err) { alert("Erreur connexion serveur"); } finally { setLoading(false); }
  };

  return (
    <Router>
      <Routes>
        {/* ROUTES PUBLIQUES (Login/Register) */}
        <Route path="/login" element={!isAuthenticated ? <Login setIsAuthenticated={setIsAuthenticated} /> : <Navigate to="/" />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />

        {/* ROUTES PRIVÉES (Protégées) */}
        <Route path="*" element={
          isAuthenticated ? (
            <div className="flex min-h-screen">
              <Sidebar onLogout={handleLogout} />
              <main className="flex-1 ml-64 p-8">
                <Routes>
                  <Route path="/" element={<Home formData={formData} handleChange={handleChange} handleSubmit={handleSubmit} loading={loading} result={result} />} />
                  <Route path="/dashboard" element={<Dashboard result={result} formData={formData} />} />
                  <Route path="/history" element={<History history={history} />} />
                </Routes>
              </main>
            </div>
          ) : (
            <Navigate to="/login" />
          )
        } />
      </Routes>
    </Router>
  );
}

export default App;