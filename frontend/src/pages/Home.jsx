import React from 'react';
import AIAssistant from '../components/AIAssistant';

export default function Home({ formData, handleChange, handleSubmit, loading, result }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
      
      {/* FORMULAIRE - COLONNE LARGE */}
      <div className="lg:col-span-8 glass-panel p-8 rounded-2xl">
        <div className="mb-6 pb-4 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">Configuration de la Simulation</h2>
            <p className="text-sm text-gray-400">Saisissez les paramètres financiers ci-dessous.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
          {[
            { label: "Revenu Mensuel", name: "revenu_mensuel", unit: "€" },
            { label: "Dettes Totales", name: "dette_totale", unit: "€" },
            { label: "Épargne Disponible", name: "epargne", unit: "€" },
            { label: "Ancienneté Emploi", name: "anciennete_emploi", unit: "Ans" },
            { label: "Montant Crédit", name: "montant_demande", unit: "€" },
            { label: "Durée", name: "duree_pret", unit: "Mois" },
          ].map((field) => (
            <div key={field.name} className="col-span-1">
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{field.label}</label>
              <div className="relative">
                <input 
                  type="number" name={field.name} value={formData[field.name]} onChange={handleChange} 
                  className="w-full p-3 glass-input rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm"
                  placeholder="0"
                />
                <span className="absolute right-3 top-3 text-gray-500 text-sm">{field.unit}</span>
              </div>
            </div>
          ))}

          <div className="col-span-2 mt-4 flex justify-end">
            <button 
              type="submit" disabled={loading}
              className={`px-8 py-3 rounded-lg text-white font-medium text-sm tracking-wide transition-all shadow-lg ${loading ? 'bg-slate-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/20'}`}
            >
              {loading ? 'TRAITEMENT EN COURS...' : 'LANCER L\'ANALYSE'}
            </button>
          </div>
        </form>
      </div>

      {/* CHATBOT - COLONNE DROITE */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <AIAssistant result={result} data={formData} />
        
        {result && (
           <div className={`glass-panel p-6 rounded-2xl border-l-4 ${result.decision === "ACCORDÉ" ? 'border-emerald-500' : 'border-rose-500'}`}>
             <h3 className="text-white font-bold text-sm uppercase mb-1">Résultat Préliminaire</h3>
             <div className="flex items-center justify-between">
                <span className={`text-2xl font-bold ${result.decision === "ACCORDÉ" ? 'text-emerald-400' : 'text-rose-400'}`}>
                {result.decision}
                </span>
                <span className="text-gray-400 text-sm">{result.score_confiance}% Confiance</span>
             </div>
           </div>
        )}
      </div>
    </div>
  );
}