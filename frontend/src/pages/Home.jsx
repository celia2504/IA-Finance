import React from 'react';
import AIAssistant from '../components/AIAssistant';

export default function Home({ formData, handleChange, handleSubmit, loading, result }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
      {/* GAUCHE : FORMULAIRE */}
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
        <h2 className="text-2xl font-bold mb-6 text-blue-400">📝 Nouvelle Simulation</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          {[
            { label: "Revenu Mensuel (€)", name: "revenu_mensuel" },
            { label: "Dettes Totales (€)", name: "dette_totale" },
            { label: "Épargne (€)", name: "epargne" },
            { label: "Ancienneté (Ans)", name: "anciennete_emploi" },
            { label: "Montant Crédit (€)", name: "montant_demande" },
            { label: "Durée (Mois)", name: "duree_pret" },
          ].map((field) => (
            <div key={field.name}>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">{field.label}</label>
              <input 
                type="number" name={field.name} value={formData[field.name]} onChange={handleChange} 
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-purple-500 outline-none" 
              />
            </div>
          ))}

          <button 
            type="submit" disabled={loading}
            className={`w-full py-4 mt-6 rounded-xl text-white font-bold text-lg shadow-lg shadow-purple-900/50 transform transition hover:scale-105 active:scale-95 ${loading ? 'bg-slate-600' : 'bg-gradient-to-r from-blue-600 to-purple-600'}`}
          >
            {loading ? 'Calculs...' : 'Analyser mon Profil 🚀'}
          </button>
        </form>
      </div>

      {/* DROITE : ASSISTANT IA & VERDICT RAPIDE */}
      <div className="space-y-6">
        <AIAssistant result={result} data={formData} />
        
        {result && (
           <div className="bg-slate-800 p-6 rounded-2xl border-l-4 border-blue-500 shadow-xl">
             <h3 className="text-white font-bold text-lg mb-2">Résultat Rapide :</h3>
             <span className={`px-4 py-2 rounded-lg font-bold ${result.decision === "ACCORDÉ" ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
               {result.decision} (Confiance : {result.score_confiance}%)
             </span>
             <p className="text-gray-400 text-sm mt-4">
               👉 Allez dans l'onglet <strong>"Analyse Détaillée"</strong> pour voir les graphiques, le PDF et l'échéancier.
             </p>
           </div>
        )}
      </div>
    </div>
  );
}