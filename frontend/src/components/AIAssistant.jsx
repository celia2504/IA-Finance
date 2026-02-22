import React, { useState, useEffect, useRef } from 'react';

export default function AIAssistant({ result, data }) {
  const [messages, setMessages] = useState([
    { sender: 'bot', text: "Bonjour 👋. Je suis l'IA CreditPath. Lancez une simulation pour commencer l'analyse !" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // --- LISTE DES CHOIX POSSIBLES (Boutons) ---
  const suggestions = [
    "Pourquoi ce résultat ? 🧐",
    "Comment améliorer mon dossier ? 🚀",
    "Est-ce que je suis éligible ? 🏦",
    "Quels sont les taux actuels ? 📈"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  useEffect(() => {
    if (result) {
      const initialText = result.decision === "ACCORDÉ"
        ? `Analyse terminée : Avis FAVORABLE ✅ (${result.score_confiance}% de confiance).`
        : `Analyse terminée : Avis DÉFAVORABLE ⚠️.`;
      
      setMessages(prev => [...prev, { sender: 'bot', text: initialText }]);
    }
  }, [result]);

  // Fonction unique pour envoyer un message (via bouton ou input)
  const sendMessage = async (text) => {
    if (!text.trim()) return;

    // 1. Affiche le message de l'utilisateur
    const userMessage = { sender: 'user', text: text };
    setMessages(prev => [...prev, userMessage]);
    setInput(""); // Vide l'input si utilisé
    setIsTyping(true);

    try {
      // On ajoute la décision au contexte pour que le backend sache si c'est accordé ou non
      const contextData = { ...data, decision: result ? result.decision : null };

      const response = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: contextData
        }),
      });

      const dataRes = await response.json();
      setMessages(prev => [...prev, { sender: 'bot', text: dataRes.response }]);

    } catch (err) {
      setMessages(prev => [...prev, { sender: 'bot', text: "Erreur de connexion serveur 🔌." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="bg-slate-800 rounded-2xl shadow-xl border border-blue-500/30 flex flex-col h-[450px] animate-fade-in relative">
      
      {/* Header */}
      <div className="bg-slate-900 p-4 border-b border-slate-700 flex items-center gap-3 rounded-t-2xl">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">IA</div>
        <div>
          <h3 className="text-white font-bold text-sm">FinAdvisor Bot</h3>
          <p className="text-blue-400 text-xs">Assistant Intelligent</p>
        </div>
      </div>

      {/* Zone de Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-800/50 scrollbar-thin scrollbar-thumb-slate-600">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-md ${
              msg.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-slate-700 text-gray-200 rounded-bl-none border border-slate-600'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        
        {isTyping && (
           <div className="flex justify-start">
             <div className="bg-slate-700 p-3 rounded-2xl rounded-bl-none border border-slate-600">
               <div className="flex gap-1">
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                 <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
               </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ZONE DE SUGGESTIONS (Les Boutons) */}
      <div className="px-4 pt-2 bg-slate-800/80 backdrop-blur-sm">
        <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wider">Suggestions rapides :</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {suggestions.map((text, index) => (
            <button
              key={index}
              onClick={() => sendMessage(text)}
              disabled={isTyping} // On désactive si l'IA écrit déjà
              className="text-xs bg-slate-700 hover:bg-blue-600 text-blue-100 hover:text-white border border-blue-500/30 px-3 py-1.5 rounded-full transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      {/* Input Classique (si l'utilisateur veut quand même écrire) */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-900 border-t border-slate-700 rounded-b-2xl flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ou écrivez votre question..."
          className="flex-1 bg-slate-800 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700"
        />
        <button 
          type="submit"
          disabled={!input.trim() || isTyping}
          className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-colors disabled:opacity-50"
        >
          ➤
        </button>
      </form>

    </div>
  );
}