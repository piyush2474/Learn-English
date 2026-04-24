import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, Globe, Check, Users, RefreshCw, Mic, 
  Volume2, BookOpen, GraduationCap, TrendingUp, Search,
  Copy, Languages, ArrowRight
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

  const handleTranslate = async () => {
    if (!transText.trim()) return;
    setIsTranslating(true);
    try {
      // Using robust Google Translate endpoint for real accuracy
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(transText)}`);
      const data = await res.json();
      if (data && data[0] && data[0][0]) {
        // Concatenate multiple segments if the translation is long
        const fullTranslation = data[0].map(segment => segment[0]).join('');
        setTransResult(fullTranslation);
      }
    } catch (err) {
      console.error("Translation failed:", err);
      setTransResult("Analysis Timeout. Please retry.");
    } finally {
      setIsTranslating(false);
    }
  };

  // Fetch synonyms whenever stealthWord changes
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
    if (!window.speechSynthesis) return;
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
        activeTab === id 
          ? 'text-white' 
          : 'text-gray-500 hover:text-gray-300'
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
    <div className="flex-1 bg-[#121212] flex overflow-hidden font-sans selection:bg-blue-500/30 h-full">
      {/* Minimalist Sidebar - Desktop Only */}
      <div className="w-64 shrink-0 bg-[#0a0a0a] flex flex-col p-8 hidden lg:flex border-r border-white/[0.02] h-full">
        <div className="mb-12 space-y-1">
          <h1 className="text-xl font-black text-white tracking-tighter">STUDENT <span className="text-blue-500">.</span></h1>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Portal Access v4</p>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto">
          <div className="space-y-1">
            <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.2em] mb-4 ml-4">Curriculum</p>
            <NavItem id="dashboard" icon={LayoutGrid} label="Overview" />
            <NavItem id="vocabulary" icon={Globe} label="Vocabulary" />
          </div>
          <div className="space-y-1 pt-6">
            <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.2em] mb-4 ml-4">Analysis</p>
            <NavItem id="grammar" icon={Check} label="Grammar Lab" />
            <NavItem id="stats" icon={Users} label="Leaderboard" />
          </div>
        </nav>

        <div className="mt-auto space-y-4 pt-8 border-t border-white/[0.03]">
           <div className="flex items-center gap-3 px-4">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-[10px] font-bold text-blue-500">PB</div>
              <div>
                 <p className="text-[10px] font-bold text-white uppercase tracking-wider">Piyush B.</p>
                 <p className="text-[9px] text-gray-500 font-medium">B2 Intermediate</p>
              </div>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#121212] scrollbar-hide h-full flex flex-col">
        {/* Header - Mobile & Desktop unification */}
        <div className="p-6 flex items-center justify-between border-b border-white/[0.02] bg-[#0a0a0a] sticky top-0 z-10">
          <span className="font-black text-white tracking-tighter text-sm md:text-base">STUDENT<span className="text-blue-500">.</span></span>
          
          <div className="flex items-center gap-4 lg:hidden">
            <select 
              value={activeTab} 
              onChange={(e) => setActiveTab(e.target.value)}
              className="bg-white/5 rounded-full px-4 py-2 border-none text-[9px] font-black text-blue-500 outline-none uppercase tracking-widest"
            >
              <option value="dashboard">Overview</option>
              <option value="vocabulary">Vocabulary</option>
              <option value="grammar">Grammar</option>
              <option value="stats">Leaderboard</option>
            </select>
          </div>
        </div>

        <div className="p-6 md:p-12 lg:p-20 max-w-6xl mx-auto w-full flex-1 flex flex-col">
          {activeTab === 'vocabulary' && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="relative py-8 md:py-12 border-b border-white/[0.03] mb-8 md:mb-12">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 md:w-12 h-[1px] bg-blue-500/50" />
                  <span className="text-[9px] md:text-[10px] font-bold text-blue-500 uppercase tracking-[0.3em]">Featured Expression</span>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8">
                  <div className="space-y-2">
                    <h2 className="text-5xl md:text-8xl lg:text-9xl font-black text-white tracking-tighter capitalize leading-none break-words">
                      {stealthWord?.word || 'Ubiquitous'}
                    </h2>
                    <div className="flex items-center gap-4 text-blue-500/60 font-medium text-lg md:text-xl ml-1 md:ml-2">
                      <span>{stealthWord?.phonetic || '/juːˈbɪkwɪtəs/'}</span>
                      <button 
                        onClick={() => handleSpeak(stealthWord?.word || 'Ubiquitous')}
                        className={`p-2 rounded-full transition-all active:scale-90 ${isSpeaking ? 'bg-blue-500 text-white shadow-2xl shadow-blue-500/50' : 'hover:bg-white/5 text-blue-400'}`}
                      >
                        <Volume2 className="w-5 h-5 md:w-6 md:h-6" />
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={fetchNewWord}
                    disabled={isFetchingWord}
                    className="group relative w-full md:w-auto px-8 py-4 bg-white text-black font-black text-[10px] md:text-xs uppercase tracking-widest rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center"
                  >
                    <span className="flex items-center gap-2">
                      Next Module <RefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isFetchingWord ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid lg:grid-cols-12 gap-10 md:gap-12">
                <div className="lg:col-span-8 space-y-10 md:space-y-12">
                  <section className="space-y-4">
                    <h3 className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest">Primary Definition</h3>
                    <p className="text-xl md:text-3xl lg:text-4xl text-gray-200 leading-tight font-medium">
                      "{stealthWord?.meanings[0].definitions[0].definition || 'Existing or being everywhere at the same time.'}"
                    </p>
                  </section>

                  {stealthWord?.meanings[0].definitions[0].example && (
                    <section className="space-y-4">
                      <h3 className="text-[10px] md:text-sm font-bold text-gray-500 uppercase tracking-widest">Usage in Context</h3>
                      <div className="relative p-6 md:p-8 bg-gradient-to-r from-blue-500/5 to-transparent border-l border-blue-500/30">
                        <p className="text-base md:text-xl text-gray-400 italic leading-relaxed">
                          "{stealthWord.meanings[0].definitions[0].example}"
                        </p>
                      </div>
                    </section>
                  )}

                  <div className="flex flex-wrap gap-2 md:gap-3">
                    <span className="text-[9px] md:text-[10px] font-bold text-gray-600 uppercase tracking-widest self-center mr-2">Synonyms</span>
                    {synonyms.length > 0 ? synonyms.map((s, i) => (
                      <span key={i} className="px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/10 text-xs md:text-sm text-gray-300 font-medium hover:border-blue-500/50 hover:text-blue-500 transition-all cursor-default">
                        {s.word}
                      </span>
                    )) : (
                      <span className="text-xs md:text-sm text-gray-600 italic">Finding related terms...</span>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-10 md:space-y-12">
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Learning Metrics</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-white/[0.03] pb-4">
                        <span className="text-xs text-gray-400">Complexity</span>
                        <span className="text-xs font-bold text-white uppercase">Advanced</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/[0.03] pb-4">
                        <span className="text-xs text-gray-400">Exam Probability</span>
                        <span className="text-xs font-bold text-blue-500">89%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Related Modules</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                      <div className="flex items-center gap-3 md:gap-4 group cursor-pointer">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-blue-500 transition-colors">
                          <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500 group-hover:text-blue-500" />
                        </div>
                        <span className="text-[9px] md:text-xs font-bold text-gray-400 group-hover:text-white transition-colors uppercase tracking-widest">Etymology</span>
                      </div>
                      <div className="flex items-center gap-3 md:gap-4 group cursor-pointer">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-blue-500 transition-colors">
                          <GraduationCap className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500 group-hover:text-blue-500" />
                        </div>
                        <span className="text-[9px] md:text-xs font-bold text-gray-400 group-hover:text-white transition-colors uppercase tracking-widest">Exam Simulation</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-16 md:space-y-32 animate-in fade-in slide-in-from-bottom-8 duration-1000 flex-1">
              {/* Translation Hero Module */}
              <section className="space-y-8 md:space-y-12">
                <header className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-3 md:h-4 bg-blue-500" />
                    <p className="text-blue-500 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.3em]">Language Translation Engine</p>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8">
                    <h2 className="text-3xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter max-w-2xl leading-none">
                      Master the <span className="text-blue-500">Universal</span> Language.
                    </h2>
                    
                    {/* Language Selector */}
                    <div className="flex items-center gap-3 md:gap-4 bg-white/[0.02] border border-white/[0.05] rounded-full px-4 py-2 md:px-6 md:py-3 w-fit">
                      <Languages className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500" />
                      <select 
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="bg-transparent border-none text-[9px] md:text-[10px] font-black text-white outline-none uppercase tracking-widest cursor-pointer"
                      >
                        {languages.map(lang => (
                          <option key={lang.code} value={lang.code} className="bg-[#121212]">{lang.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </header>

                <div className="relative group flex-1 flex flex-col">
                  <textarea 
                    value={transText}
                    onChange={(e) => setTransText(e.target.value)}
                    placeholder="Type in English..."
                    className="w-full bg-transparent border-none text-2xl md:text-4xl lg:text-5xl text-white placeholder:text-white/[0.03] focus:outline-none resize-none leading-tight font-black min-h-[100px] md:min-h-[120px]"
                  />
                  
                  {transResult && (
                    <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                      <p className="text-[9px] md:text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-2">
                        Translation <ArrowRight className="w-2 h-2 md:w-3 md:h-3" /> {languages.find(l => l.code === targetLang)?.name}
                      </p>
                      <div className="flex items-start justify-between gap-4 md:gap-8">
                        <p className="text-2xl md:text-4xl lg:text-5xl font-black text-blue-500 tracking-tight leading-tight flex-1">
                          {transResult}
                        </p>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(transResult);
                          }}
                          className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all shrink-0 active:scale-90"
                        >
                          <Copy className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 md:mt-12 flex flex-col md:flex-row items-center gap-4 md:gap-6">
                    <button 
                      onClick={handleTranslate}
                      disabled={isTranslating || !transText.trim()}
                      className={`group w-full md:w-auto flex items-center justify-center gap-4 px-8 md:px-10 py-4 md:py-5 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest transition-all ${
                        isTranslating 
                          ? 'bg-blue-600/50 text-white cursor-not-allowed' 
                          : 'bg-white text-black hover:scale-105 active:scale-95 shadow-xl shadow-white/5'
                      }`}
                    >
                      {isTranslating ? 'Analyzing Syntax...' : 'Run Diagnostics'}
                      {!isTranslating && <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:translate-x-1 transition-transform" />}
                    </button>
                    
                    <button 
                      onClick={() => { setTransText(''); setTransResult(''); }}
                      className="w-full md:w-auto py-2 md:py-0 text-[9px] md:text-[10px] font-bold text-gray-600 uppercase tracking-widest hover:text-white transition-colors"
                    >
                      Reset Engine
                    </button>
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16 border-t border-white/[0.03] pt-12 md:pt-24">
                <div className="space-y-4 md:space-y-6">
                  <div className="text-4xl md:text-6xl font-black text-white">14</div>
                  <div className="h-[2px] w-8 md:w-12 bg-blue-500" />
                  <div>
                    <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">Day Streak</h4>
                    <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">You are currently outperforming 94% of active learners.</p>
                  </div>
                </div>

                <div className="space-y-4 md:space-y-6">
                  <div className="text-4xl md:text-6xl font-black text-white">B2</div>
                  <div className="h-[2px] w-8 md:w-12 bg-green-500" />
                  <div>
                    <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">Proficiency</h4>
                    <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">Advanced Intermediate level verified by assessment.</p>
                  </div>
                </div>

                <div className="space-y-4 md:space-y-6">
                  <div className="text-4xl md:text-6xl font-black text-white">64<span className="text-blue-500">%</span></div>
                  <div className="h-[2px] w-8 md:w-12 bg-purple-500" />
                  <div>
                    <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">Curriculum</h4>
                    <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">Currently completing the Phrasal Verbs mastery track.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'grammar' && (
            <div className="space-y-16 md:space-y-24 animate-in fade-in slide-in-from-bottom-8 duration-1000 flex-1 flex flex-col">
              <header className="space-y-2">
                <p className="text-blue-500 font-bold text-[9px] md:text-[10px] uppercase tracking-widest">Syntax Analysis</p>
                <h2 className="text-3xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter">Grammar Lab</h2>
                <p className="text-gray-500 text-sm md:text-lg max-w-xl leading-relaxed">Refine your linguistic structure. Type naturally, and the engine will analyze your syntax.</p>
              </header>

              <div className="relative flex-1 flex flex-col group min-h-[300px] md:min-h-[400px]">
                <textarea 
                  value={practiceText}
                  onChange={(e) => setPracticeText(e.target.value)}
                  placeholder="Begin drafting your sentence here..."
                  className="flex-1 bg-transparent border-none text-xl md:text-3xl lg:text-4xl text-white placeholder:text-white/[0.03] focus:outline-none resize-none leading-relaxed font-medium"
                />
                
                <div className="mt-auto flex flex-col md:flex-row items-center gap-6 md:gap-12 border-t border-white/[0.03] pt-8 md:pt-12">
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="group w-full md:w-auto flex items-center justify-center gap-4 md:gap-6 text-white hover:text-blue-500 transition-all"
                  >
                    <div className={`w-10 h-10 md:w-14 md:h-14 rounded-full border border-white/10 flex items-center justify-center group-hover:border-blue-500 transition-all ${isAnalyzing ? 'bg-blue-600 border-blue-600 scale-110' : ''}`}>
                       <Check className={`w-4 h-4 md:w-6 md:h-6 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{isAnalyzing ? 'Analyzing Engine...' : 'Run Diagnostics'}</span>
                  </button>
                  
                  <button 
                    onClick={() => setPracticeText('')}
                    className="w-full md:w-auto py-2 md:py-0 text-[9px] md:text-[10px] font-bold text-gray-600 uppercase tracking-widest hover:text-white transition-colors text-center"
                  >
                    Reset Workspace
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-16 md:space-y-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <header className="space-y-2">
                <p className="text-blue-500 font-bold text-[9px] md:text-[10px] uppercase tracking-widest">Global Proficiency</p>
                <h2 className="text-3xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter">Leaderboard</h2>
              </header>

              <div className="space-y-2 md:space-y-4">
                <div className="grid grid-cols-12 px-4 md:px-8 py-4 md:py-6 text-[8px] md:text-[9px] font-black text-gray-700 uppercase tracking-[0.3em] border-b border-white/[0.02]">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-6 md:col-span-6">Student</div>
                  <div className="col-span-2 text-center hidden md:block">Proficiency</div>
                  <div className="col-span-5 md:col-span-3 text-right">XP Total</div>
                </div>
                
                {[
                  { name: 'Alex M.', points: '12,450', level: 'C1', streak: '45' },
                  { name: 'Sarah K.', points: '11,200', level: 'B2', streak: '12' },
                  { name: 'Hiroshi T.', points: '9,800', level: 'C2', streak: '89' },
                  { name: 'You', points: '4,200', level: 'B2', streak: '14', isMe: true },
                  { name: 'Elena R.', points: '3,100', level: 'B1', streak: '7' }
                ].map((user, i) => (
                  <div key={i} className={`grid grid-cols-12 items-center px-4 md:px-8 py-6 md:py-10 transition-all hover:bg-white/[0.01] rounded-2xl md:rounded-[2rem] group ${user.isMe ? 'bg-blue-500/5 border border-blue-500/10' : ''}`}>
                    <div className="col-span-1 text-xs md:text-sm font-black text-gray-700">0{i + 1}</div>
                    <div className="col-span-6 md:col-span-6 flex items-center gap-3 md:gap-6">
                      <div className={`w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center text-[10px] md:text-sm font-black ${user.isMe ? 'bg-blue-500 text-white' : 'bg-white/[0.03] text-gray-500 group-hover:bg-blue-500/20 group-hover:text-blue-500 transition-colors'}`}>
                        {user.name[0]}
                      </div>
                      <div className="overflow-hidden">
                         <p className="text-xs md:text-base font-bold text-white truncate">{user.name}</p>
                         <p className="text-[8px] md:text-[10px] text-gray-500 uppercase font-black tracking-widest truncate">{user.streak}d streak</p>
                      </div>
                    </div>
                    <div className="col-span-2 text-center hidden md:block">
                      <span className="text-[8px] md:text-[9px] font-black text-blue-500 border border-blue-500/30 px-2 py-1 md:px-3 md:py-1.5 rounded-full uppercase tracking-widest">{user.level}</span>
                    </div>
                    <div className="col-span-5 md:col-span-3 text-right text-base md:text-2xl font-black text-white tracking-tighter">{user.points}</div>
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
