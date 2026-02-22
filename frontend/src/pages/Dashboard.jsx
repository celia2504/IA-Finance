import React from 'react';
// Imports des librairies PDF (CORRIGÉS)
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // <-- Import direct de la fonction

// Imports des graphiques
import FinancialCharts from '../components/FinancialCharts';
import RateComparator from '../components/RateComparator';
import AmortizationTable from '../components/AmortizationTable';
import ActionPlan from '../components/ActionPlan';

export default function Dashboard({ result, formData }) {
  
  // Sécurité : Si pas de résultat
  if (!result) {
    return (
      <div className="text-center py-20 bg-slate-800 rounded-2xl border border-slate-700 animate-fade-in">
        <p className="text-6xl mb-4">📊</p>
        <h2 className="text-2xl font-bold text-white mb-2">Aucune analyse disponible</h2>
        <p className="text-gray-400">Veuillez d'abord lancer une simulation sur la page d'accueil.</p>
      </div>
    );
  }

  // --- FONCTION GÉNÉRATION PDF (VERSION ROBUSTE) ---
  const generatePDF = () => {
    try {
        console.log("Génération du PDF lancée...");
        
        const doc = new jsPDF();
        
        // 1. EN-TÊTE
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 40, 'F'); 
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("CreditPath AI", 105, 20, null, null, "center");
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Certificat d'Éligibilité & Analyse Financière", 105, 30, null, null, "center");

        // 2. INFOS CLIENT
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Date du rapport : ${new Date().toLocaleDateString()}`, 15, 50);
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("DÉTAILS DU PROFIL :", 15, 60);
        doc.setFont("helvetica", "normal");
        doc.text(`• Revenu Mensuel : ${formData.revenu_mensuel} €`, 15, 68);
        doc.text(`• Dettes Actuelles : ${formData.dette_totale} €`, 15, 76);
        doc.text(`• Épargne Disponible : ${formData.epargne} €`, 15, 84);
        doc.text(`• Demande : ${formData.montant_demande} € sur ${formData.duree_pret} mois`, 15, 92);

        // 3. VERDICT
        if (result.decision === "ACCORDÉ") {
            doc.setFillColor(220, 252, 231); 
            doc.rect(15, 100, 180, 15, 'F');
            doc.setTextColor(21, 128, 61); 
            doc.setFont("helvetica", "bold");
            doc.text(`✅ DÉCISION : ACCORDÉ (Confiance IA : ${result.score_confiance}%)`, 20, 110);
        } else {
            doc.setFillColor(254, 226, 226); 
            doc.rect(15, 100, 180, 15, 'F');
            doc.setTextColor(185, 28, 28); 
            doc.setFont("helvetica", "bold");
            doc.text(`⚠️ DÉCISION : REFUSÉ (Risque calculé)`, 20, 110);
        }

        // 4. TABLEAU D'AMORTISSEMENT
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("ÉCHÉANCIER (12 premiers mois) :", 15, 130);

        const tableData = result.finance?.tableau_amortissement || [];
        
        // C'EST ICI LA CORRECTION PRINCIPALE : autoTable(doc, ...) au lieu de doc.autoTable(...)
        autoTable(doc, {
            startY: 135,
            head: [['Mois', 'Mensualité', 'Intérêts', 'Capital', 'Restant']],
            body: tableData.slice(0, 12).map(row => [
                row.mois, 
                row.mensualite + " €", 
                row.interet + " €", 
                row.principal + " €", 
                row.restant + " €"
            ]),
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59] },
            styles: { fontSize: 9 },
        });

        // 5. PIED DE PAGE
        // On récupère la position Y après le tableau via la propriété lastAutoTable
        const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 200;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Document généré automatiquement par CreditPath AI.", 105, 280, null, null, "center");

        // 6. SAUVEGARDE
        doc.save("CreditPath_Analyse.pdf");

    } catch (error) {
        console.error("ERREUR PDF DÉTAILLÉE :", error);
        alert("Erreur lors de la génération. Ouvrez la console (F12) pour voir le détail.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Header Dashboard */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-slate-800 p-6 rounded-2xl border-l-4 border-purple-500 shadow-xl gap-4">
         <div>
           <h2 className="text-2xl font-bold text-white">Analyse Approfondie</h2>
           <p className="text-gray-400 text-sm">Visualisez les indicateurs clés et téléchargez votre dossier.</p>
         </div>
         
         <button 
            onClick={generatePDF} 
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/50 flex items-center gap-2 active:scale-95"
         >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
             <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
           </svg>
           Télécharger le PDF
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinancialCharts data={formData} result={result} />
        <RateComparator finance={result.finance} />
      </div>

      <AmortizationTable schedule={result.finance.tableau_amortissement} />
      <ActionPlan actions={result.plan_action} decision={result.decision} />

    </div>
  );
}