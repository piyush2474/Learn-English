import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, Globe, Check, Users, RefreshCw, Mic, 
  Volume2, BookOpen, GraduationCap, TrendingUp, Search
} from 'lucide-react';

const LMSDashboard = ({ isFetchingWord, stealthWord, fetchNewWord }) => {
  const [activeTab, setActiveTab] = useState('vocabulary');
  const [practiceText, setPracticeText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [synonyms, setSynonyms] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

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
      {/* Minimalist Sidebar */}
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
      <div className="flex-1 overflow-y-auto bg-[#121212] scrollbar-hide h-full">
        {/* Header Mobile Only */}
        <div className="lg:hidden p-6 flex items-center justify-between border-b border-white/[0.02] bg-[#0a0a0a] sticky top-0 z-10">
          <span className="font-black text-white tracking-tighter">STUDENT<span className="text-blue-500">.</span></span>
          <select 
            value={activeTab} 
            onChange={(e) => setActiveTab(e.target.value)}
            className="bg-transparent border-none text-[10px] font-black text-blue-500 outline-none uppercase tracking-widest"
          >
            <option value="dashboard">Overview</option>
            <option value="vocabulary">Vocabulary</option>
            <option value="grammar">Grammar</option>
            <option value="stats">Leaderboard</option>
          </select>
        </div>

        <div className="p-10 md:p-20 max-w-6xl mx-auto min-h-full flex flex-col">
          {activeTab === 'vocabulary' && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="relative py-12 border-b border-white/[0.03] mb-12">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-12 h-[1px] bg-blue-500/50" />
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.3em]">Featured Expression</span>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div className="space-y-2">
                    <h2 className="text-7xl md:text-9xl font-black text-white tracking-tighter capitalize leading-none">
                      {stealthWord?.word || 'Ubiquitous'}
                    </h2>
                    <div className="flex items-center gap-4 text-blue-500/60 font-medium text-xl ml-2">
                      <span>{stealthWord?.phonetic || '/juːˈbɪkwɪtəs/'}</span>
                      <button 
                        onClick={() => handleSpeak(stealthWord?.word || 'Ubiquitous')}
                        className={`p-2 rounded-full transition-all active:scale-90 ${isSpeaking ? 'bg-blue-500 text-white shadow-2xl shadow-blue-500/50' : 'hover:bg-white/5 text-blue-400'}`}
                      >
                        <Volume2 className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={fetchNewWord}
                    disabled={isFetchingWord}
                    className="group relative px-8 py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      Next Module <RefreshCw className={`w-4 h-4 ${isFetchingWord ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'}`} />
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-8 space-y-12">
                  <section className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Primary Definition</h3>
                    <p className="text-3xl md:text-4xl text-gray-200 leading-tight font-medium">
                      "{stealthWord?.meanings[0].definitions[0].definition || 'Existing or being everywhere at the same time.'}"
                    </p>
                  </section>

                  {stealthWord?.meanings[0].definitions[0].example && (
                    <section className="space-y-4">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Usage in Context</h3>
                      <div className="relative p-8 bg-gradient-to-r from-blue-500/5 to-transparent border-l border-blue-500/30">
                        <p className="text-xl text-gray-400 italic leading-relaxed">
                          "{stealthWord.meanings[0].definitions[0].example}"
                        </p>
                      </div>
                    </section>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest self-center mr-2">Synonyms</span>
                    {synonyms.length > 0 ? synonyms.map((s, i) => (
                      <span key={i} className="px-4 py-2 rounded-full border border-white/10 text-sm text-gray-300 font-medium hover:border-blue-500/50 hover:text-blue-500 transition-all cursor-default">
                        {s.word}
                      </span>
                    )) : (
                      <span className="text-sm text-gray-600 italic">Finding related terms...</span>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-12">
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
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 group cursor-pointer">
                        <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-blue-500 transition-colors">
                          <TrendingUp className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors uppercase tracking-widest">Etymology Trace</span>
                      </div>
                      <div className="flex items-center gap-4 group cursor-pointer">
                        <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-blue-500 transition-colors">
                          <GraduationCap className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
                        </div>
                        <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors uppercase tracking-widest">Exam Simulation</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <header className="space-y-2">
                <p className="text-blue-500 font-bold text-xs uppercase tracking-widest">Student Overview</p>
                <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter">Academic Progress</h2>
              </header>

              <div className="grid md:grid-cols-3 gap-16">
                <div className="space-y-6">
                  <div className="text-6xl font-black text-white">14</div>
                  <div className="h-[2px] w-12 bg-blue-500" />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-widest">Day Streak</h4>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">You are currently outperforming 94% of active learners.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="text-6xl font-black text-white">B2</div>
                  <div className="h-[2px] w-12 bg-green-500" />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-widest">Proficiency</h4>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">Advanced Intermediate level verified by assessment.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="text-6xl font-black text-white">64<span className="text-blue-500">%</span></div>
                  <div className="h-[2px] w-12 bg-purple-500" />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-widest">Curriculum</h4>
                    <p className="text-xs text-gray-500 mt-2 leading-relaxed">Currently completing the Phrasal Verbs mastery track.</p>
                  </div>
                </div>
              </div>

              <section className="space-y-12">
                <div className="flex items-center justify-between border-b border-white/[0.03] pb-6">
                  <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">Curated Reading</h3>
                  <button className="text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:text-white transition-colors">Expand Library</button>
                </div>

                <div className="grid md:grid-cols-2 gap-16">
                  {[
                    { title: 'The subtle art of Business English', time: '5 min read', desc: 'Master the nuance of professional negotiation and global email etiquette.' },
                    { title: 'Idioms you should avoid in 2024', time: '8 min read', desc: 'Modern alternatives to clichés that make your English sound dated.' }
                  ].map((article, i) => (
                    <div key={i} className="group cursor-pointer space-y-6">
                      <div className="aspect-[16/9] bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden relative transition-all group-hover:border-blue-500/30">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                           <span className="text-[9px] font-bold text-white uppercase bg-blue-600 px-3 py-1 rounded-full tracking-widest">Module active</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-2xl font-bold text-white group-hover:text-blue-500 transition-colors tracking-tight">{article.title}</h4>
                        <p className="text-sm text-gray-500 leading-relaxed max-w-sm">{article.desc}</p>
                        <span className="text-[9px] text-blue-500 font-bold uppercase tracking-[0.2em] block pt-2">{article.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'grammar' && (
            <div className="space-y-24 animate-in fade-in slide-in-from-bottom-8 duration-1000 flex-1 flex flex-col">
              <header className="space-y-2">
                <p className="text-blue-500 font-bold text-xs uppercase tracking-widest">Syntax Analysis</p>
                <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter">Grammar Lab</h2>
                <p className="text-gray-500 text-lg max-w-xl leading-relaxed">Refine your linguistic structure. Type naturally, and the engine will analyze your syntax.</p>
              </header>

              <div className="relative flex-1 flex flex-col group min-h-[400px]">
                <textarea 
                  value={practiceText}
                  onChange={(e) => setPracticeText(e.target.value)}
                  placeholder="Begin drafting your sentence here..."
                  className="flex-1 bg-transparent border-none text-2xl md:text-4xl text-white placeholder:text-white/[0.03] focus:outline-none resize-none leading-relaxed font-medium"
                />
                
                <div className="mt-auto flex items-center gap-12 border-t border-white/[0.03] pt-12">
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="group flex items-center gap-6 text-white hover:text-blue-500 transition-all"
                  >
                    <div className={`w-14 h-14 rounded-full border border-white/10 flex items-center justify-center group-hover:border-blue-500 transition-all ${isAnalyzing ? 'bg-blue-600 border-blue-600 scale-110' : ''}`}>
                       <Check className={`w-6 h-6 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">{isAnalyzing ? 'Analyzing Engine...' : 'Run Diagnostics'}</span>
                  </button>
                  
                  <button 
                    onClick={() => setPracticeText('')}
                    className="text-[10px] font-bold text-gray-600 uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Reset Workspace
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <header className="space-y-2">
                <p className="text-blue-500 font-bold text-xs uppercase tracking-widest">Global Proficiency</p>
                <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter">Leaderboard</h2>
              </header>

              <div className="space-y-4">
                <div className="grid grid-cols-12 px-8 py-6 text-[9px] font-black text-gray-700 uppercase tracking-[0.3em] border-b border-white/[0.02]">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-6">Student</div>
                  <div className="col-span-2 text-center">Proficiency</div>
                  <div className="col-span-3 text-right">XP Accumulation</div>
                </div>
                
                {[
                  { name: 'Alex M.', points: '12,450', level: 'C1', streak: '45' },
                  { name: 'Sarah K.', points: '11,200', level: 'B2', streak: '12' },
                  { name: 'Hiroshi T.', points: '9,800', level: 'C2', streak: '89' },
                  { name: 'You', points: '4,200', level: 'B2', streak: '14', isMe: true },
                  { name: 'Elena R.', points: '3,100', level: 'B1', streak: '7' }
                ].map((user, i) => (
                  <div key={i} className={`grid grid-cols-12 items-center px-8 py-10 transition-all hover:bg-white/[0.01] rounded-[2rem] group ${user.isMe ? 'bg-blue-500/5 border border-blue-500/10 shadow-[0_0_50px_rgba(59,130,246,0.05)]' : ''}`}>
                    <div className="col-span-1 text-sm font-black text-gray-700">0{i + 1}</div>
                    <div className="col-span-6 flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black ${user.isMe ? 'bg-blue-500 text-white' : 'bg-white/[0.03] text-gray-500 group-hover:bg-blue-500/20 group-hover:text-blue-500 transition-colors'}`}>
                        {user.name[0]}
                      </div>
                      <div>
                         <p className="text-base font-bold text-white">{user.name}</p>
                         <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{user.streak} day session streak</p>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      <span className="text-[9px] font-black text-blue-500 border border-blue-500/30 px-3 py-1.5 rounded-full uppercase tracking-widest">Level {user.level}</span>
                    </div>
                    <div className="col-span-3 text-right text-2xl font-black text-white tracking-tighter">{user.points}</div>
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
