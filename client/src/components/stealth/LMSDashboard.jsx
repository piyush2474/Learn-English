import React, { useState, useEffect } from 'react';
import { 
  Globe, Check, Users, RefreshCw, Mic, 
  Volume2, TrendingUp, Copy, Languages, X, Star, Share2, History
} from 'lucide-react';

const LMSDashboard = ({ isFetchingWord, stealthWord, fetchNewWord }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [practiceText, setPracticeText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [synonyms, setSynonyms] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // --- Translation States ---
  const [transText, setTransText] = useState('');
  const [transResult, setTransResult] = useState('');
  const [targetLang, setTargetLang] = useState('gu'); // Default Gujarati
  const [isTranslating, setIsTranslating] = useState(false);

  const languages = [
    { code: 'gu', name: 'Gujarati' },
    { code: 'hi', name: 'Hindi' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ar', name: 'Arabic' }
  ];

  // Clear result when language changes to prevent stale data
  useEffect(() => {
    setTransResult('');
  }, [targetLang]);

  const handleTranslate = async () => {
    if (!transText.trim()) return;
    setIsTranslating(true);
    try {
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(transText)}`);
      const data = await res.json();
      if (data && data[0]) {
        const fullTranslation = data[0].map(segment => segment[0]).join('');
        setTransResult(fullTranslation);
      }
    } catch (err) {
      console.error("Translation failed:", err);
      setTransResult("Analysis Timeout.");
    } finally {
      setIsTranslating(false);
    }
  };

  useEffect(() => {
    if (stealthWord?.word) {
      fetchSynonyms(stealthWord.word);
    }
  }, [stealthWord]);

  const fetchSynonyms = async (word) => {
    try {
      const res = await fetch(`https://api.datamuse.com/words?rel_syn=${word}&max=5`);
      const data = await res.json();
      setSynonyms(data);
    } catch (err) {
      console.error("Synonym fetch failed:", err);
    }
  };

  const handleSpeak = (text) => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleAnalyze = () => {
    if (!practiceText.trim()) return;
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 2000);
  };

  const NavItem = ({ id, icon: Icon, label }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`w-full group flex items-center gap-4 px-4 py-3 transition-all duration-500 relative ${
        activeTab === id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {activeTab === id && (
        <div className="absolute left-0 w-[2px] h-6 bg-blue-500 rounded-full animate-in slide-in-from-left-2 duration-300" />
      )}
      <Icon className={`w-4 h-4 transition-transform duration-500 ${activeTab === id ? 'scale-110' : 'group-hover:scale-110'}`} />
      <span className="text-xs font-bold tracking-[0.15em] uppercase">{label}</span>
    </button>
  );

  return (
    <div className="flex-1 bg-[#0a0a0a] flex overflow-hidden font-sans selection:bg-blue-500/30 h-full">
      {/* Sidebar - Desktop */}
      <div className="w-64 shrink-0 bg-[#050505] flex flex-col p-8 hidden lg:flex border-r border-white/[0.02] h-full">
        <div className="mb-12">
          <h1 className="text-xl font-black text-white tracking-tighter">STUDENT<span className="text-blue-500">.</span></h1>
        </div>
        <nav className="flex-1 space-y-6">
          <NavItem id="dashboard" icon={Languages} label="Translator" />
          <NavItem id="vocabulary" icon={Globe} label="Vocabulary" />
          <NavItem id="grammar" icon={Check} label="Grammar Lab" />
          <NavItem id="stats" icon={Users} label="Leaderboard" />
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0a]">
        {/* Top Header Pill Nav */}
        <div className="flex items-center gap-2 px-6 py-4 overflow-x-auto scrollbar-hide border-b border-white/[0.02]">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/[0.03] text-gray-500'}`}
          >
            <Languages className="w-3.5 h-3.5" /> Text
          </button>
          <button 
            onClick={() => setActiveTab('grammar')}
            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'grammar' ? 'bg-blue-600 text-white' : 'bg-white/[0.03] text-gray-500'}`}
          >
            <Check className="w-3.5 h-3.5" /> Grammar
          </button>
          <button 
            onClick={() => setActiveTab('vocabulary')}
            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'vocabulary' ? 'bg-blue-600 text-white' : 'bg-white/[0.03] text-gray-500'}`}
          >
            <Globe className="w-3.5 h-3.5" /> Vocabulary
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'stats' ? 'bg-blue-600 text-white' : 'bg-white/[0.03] text-gray-500'}`}
          >
            <Users className="w-3.5 h-3.5" /> Stats
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col">
          {activeTab === 'dashboard' && (
            <div className="flex-1 flex flex-col animate-in fade-in duration-500">
              {/* Language Switcher Bar */}
              <div className="flex items-center justify-between px-8 py-3 bg-[#050505] border-b border-white/[0.02]">
                <div className="flex-1 text-[10px] font-black text-blue-500 uppercase tracking-widest text-center">English</div>
                <div className="px-4">
                  <RefreshCw className="w-4 h-4 text-gray-800" />
                </div>
                <div className="flex-1">
                   <select 
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full bg-transparent border-none text-[10px] font-black text-blue-500 outline-none uppercase tracking-widest text-center cursor-pointer"
                  >
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code} className="bg-[#0a0a0a]">{lang.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Input Card */}
              <div className="bg-[#0a0a0a] p-8 md:p-12 relative flex flex-col border-b border-white/[0.02]">
                <div className="relative group">
                  <textarea 
                    value={transText}
                    onChange={(e) => {
                      setTransText(e.target.value);
                      if (e.target.value === '') setTransResult('');
                    }}
                    placeholder="Enter text"
                    className="w-full bg-transparent border-none text-3xl md:text-5xl text-white placeholder:text-white/5 focus:outline-none resize-none leading-tight font-medium min-h-[120px]"
                  />
                  {transText && (
                    <button 
                      onClick={() => { setTransText(''); setTransResult(''); }}
                      className="absolute top-0 right-0 p-2 text-gray-600 hover:text-white"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  )}
                </div>

                <div className="mt-8 flex items-center gap-8 text-gray-600">
                  <button onClick={() => handleSpeak(transText)} className="hover:text-blue-500 transition-colors"><Volume2 className="w-6 h-6" /></button>
                  <button className="hover:text-blue-500 transition-colors"><Mic className="w-6 h-6" /></button>
                  <div className="ml-auto flex items-center gap-4">
                    <span className="text-[10px] font-bold text-gray-800">{transText.length}</span>
                    <button 
                      onClick={handleTranslate}
                      disabled={isTranslating || !transText.trim()}
                      className={`px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${isTranslating ? 'bg-blue-600/50 text-white' : 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 active:scale-95'}`}
                    >
                      {isTranslating ? 'Analyzing...' : 'Translate'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Result Card (The Shaded Output) */}
              <div className="bg-[#111111] p-8 md:p-12 border-b border-white/[0.02] flex-1">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                    {languages.find(l => l.code === targetLang)?.name}
                  </p>
                  <Star className="w-5 h-5 text-gray-700" />
                </div>

                <div className="min-h-[120px]">
                  <p className={`text-3xl md:text-5xl font-bold leading-tight tracking-tight ${transResult ? 'text-white' : 'text-white/5'}`}>
                    {transResult || 'Translation'}
                  </p>
                </div>

                <div className="mt-8 flex items-center gap-8 text-gray-500">
                  <button onClick={() => handleSpeak(transResult)} className="hover:text-white transition-colors"><Volume2 className="w-6 h-6" /></button>
                  <button onClick={() => navigator.clipboard.writeText(transResult)} className="hover:text-white transition-colors"><Copy className="w-6 h-6" /></button>
                  <button className="hover:text-white transition-colors"><Share2 className="w-6 h-6" /></button>
                  <button className="hover:text-white transition-colors ml-auto"><TrendingUp className="w-6 h-6" /></button>
                </div>
              </div>

              {/* Bottom Large Action Circles */}
              <div className="flex items-center justify-center gap-16 py-12 bg-[#0a0a0a]">
                <div className="flex flex-col items-center gap-3 group cursor-pointer">
                  <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/5 transition-all">
                    <History className="w-6 h-6 text-gray-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">History</span>
                </div>
                <div className="flex flex-col items-center gap-3 group cursor-pointer">
                  <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/5 transition-all">
                    <Star className="w-6 h-6 text-gray-600" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Saved</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vocabulary' && (
            <div className="p-8 md:p-12 animate-in fade-in duration-500">
              <div className="relative py-12 border-b border-white/[0.03] mb-12">
                <p className="text-blue-500 font-bold text-[10px] uppercase tracking-[0.3em] mb-4">Word of the Day</p>
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div className="space-y-4">
                    <h2 className="text-6xl md:text-9xl font-black text-white tracking-tighter capitalize leading-none">
                      {stealthWord?.word || 'Ubiquitous'}
                    </h2>
                    <div className="flex items-center gap-4 text-blue-500/60 font-medium text-xl">
                      <span>{stealthWord?.phonetic || '/juːˈbɪkwɪtəs/'}</span>
                      <button onClick={() => handleSpeak(stealthWord?.word)} className="p-2 hover:bg-white/5 rounded-full"><Volume2 className="w-6 h-6" /></button>
                    </div>
                  </div>
                  <button 
                    onClick={fetchNewWord}
                    className="px-10 py-5 bg-white text-black font-black text-xs uppercase tracking-widest rounded-full hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                  >
                    Refresh <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-16">
                 <div className="space-y-6">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Meaning</h3>
                    <p className="text-2xl text-gray-200 leading-tight">"{stealthWord?.meanings?.[0]?.definitions?.[0]?.definition || 'Definition unavailable'}"</p>
                 </div>
                 <div className="space-y-6">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Synonyms</h3>
                    <div className="flex flex-wrap gap-3">
                       {synonyms.length > 0 ? synonyms.map((s, i) => <span key={i} className="px-4 py-2 rounded-full border border-white/5 text-sm text-gray-400">{s.word}</span>) : <span className="text-gray-600 italic">None found</span>}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'grammar' && (
            <div className="p-8 md:p-12 flex flex-col flex-1 animate-in fade-in duration-500">
              <header className="mb-12">
                <p className="text-blue-500 font-bold text-[10px] uppercase tracking-widest mb-2">Syntax Lab</p>
                <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Grammar Analysis</h2>
              </header>
              <textarea 
                value={practiceText}
                onChange={(e) => setPracticeText(e.target.value)}
                placeholder="Begin writing..."
                className="flex-1 bg-transparent border-none text-2xl md:text-4xl text-white placeholder:text-white/5 focus:outline-none resize-none leading-relaxed"
              />
              <div className="mt-12 flex items-center gap-8 border-t border-white/5 pt-12">
                <button 
                  onClick={handleAnalyze}
                  className="px-12 py-5 bg-blue-600 text-white rounded-full font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-3"
                >
                  {isAnalyzing ? 'Analyzing Engine...' : 'Run Diagnostics'} <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setPracticeText('')} className="text-[10px] font-bold text-gray-600 uppercase tracking-widest hover:text-white">Reset</button>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="p-8 md:p-12 animate-in fade-in duration-500">
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-12">Leaderboard</h2>
              <div className="space-y-2">
                {[
                  { name: 'Alex M.', points: '12,450', level: 'C1' },
                  { name: 'Sarah K.', points: '11,200', level: 'B2' },
                  { name: 'You', points: '4,200', level: 'B2', isMe: true },
                  { name: 'Elena R.', points: '3,100', level: 'B1' }
                ].map((user, i) => (
                  <div key={i} className={`flex items-center gap-6 p-8 rounded-3xl transition-all ${user.isMe ? 'bg-blue-600/10 border border-blue-600/20' : 'hover:bg-white/[0.02]'}`}>
                    <span className="text-xl font-black text-gray-800">0{i + 1}</span>
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center font-black text-sm">{user.name[0]}</div>
                    <div className="flex-1">
                       <p className="font-bold text-white">{user.name}</p>
                       <p className="text-[10px] text-gray-500 uppercase font-black">Level {user.level}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-xl font-black text-white">{user.points}</p>
                       <p className="text-[9px] text-gray-500 uppercase font-black">XP</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LMSDashboard;
