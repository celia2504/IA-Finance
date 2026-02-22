import React from 'react';

export default function ActionPlan({ actions, decision }) {
  return (
    <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border-l-4 border-purple-500 mt-6 animate-fade-in">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center">
        🚀 La Grille vers l'Éligibilité
      </h3>
      
      <p className="text-gray-400 mb-4 text-sm">
        {decision === "REFUSÉ" 
          ? "Plan d'action correctif généré par l'IA :"
          : "Conseils d'optimisation :"}
      </p>

      <div className="space-y-3">
        {actions.map((conseil, index) => (
          <div key={index} className="flex items-start p-4 bg-slate-900/50 rounded-xl border border-slate-700 hover:border-purple-500/50 transition-colors">
            <div className="flex-shrink-0 mt-1">
              {conseil.includes("⚠️") ? (
                <span className="text-xl">⚠️</span>
              ) : conseil.includes("✅") ? (
                <span className="text-xl">✅</span>
              ) : (
                <span className="text-xl">💡</span>
              )}
            </div>
            <p className="ml-3 text-gray-300 font-medium text-sm leading-relaxed">
              {conseil.replace("⚠️", "").replace("✅", "").replace("💰", "").replace("ℹ️", "").replace("📉", "")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}