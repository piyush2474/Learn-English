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
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
        activeTab === id 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
          : 'text-gray-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-bold tracking-tight">{label}</span>
    </button>
  );

  return (
    <div className="flex-1 bg-[#121212] flex overflow-hidden animate-in fade-in duration-700 h-full">
      {/* LMS Sidebar */}
      <div className="w-64 shrink-0 bg-[#1a1a1a] border-r border-white/5 flex flex-col p-4 hidden lg:flex h-full">
        <div className="mb-8 px-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Learn English Pro</span>
          </div>
          <h1 className="text-lg font-black text-white">LMS Dashboard</h1>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          <NavItem id="vocabulary" icon={Globe} label="Vocabulary" />
          <NavItem id="dashboard" icon={LayoutGrid} label="Overview" />
          <NavItem id="grammar" icon={Check} label="Grammar Lab" />
          <NavItem id="stats" icon={Users} label="Leaderboard" />
        </nav>

        <div className="mt-auto p-4 bg-white/5 rounded-2xl border border-white/5">
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Current Goal</p>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-300">Daily Words</span>
            <span className="text-blue-500 font-bold">12/20</span>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full w-[60%] bg-blue-500" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#121212] h-full">
        {/* Header Mobile Only */}
        <div className="lg:hidden p-4 flex items-center justify-between border-b border-white/5 bg-[#1a1a1a] sticky top-0 z-10">
          <span className="font-bold text-white">LMS Pro</span>
          <select 
            value={activeTab} 
            onChange={(e) => setActiveTab(e.target.value)}
            className="bg-white/5 border-none text-xs font-bold text-blue-500 outline-none"
          >
            <option value="vocabulary">Vocabulary</option>
            <option value="dashboard">Overview</option>
            <option value="grammar">Grammar</option>
            <option value="stats">Leaderboard</option>
          </select>
        </div>

        <div className="p-6 sm:p-10 max-w-5xl mx-auto space-y-8">
          {activeTab === 'vocabulary' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-[#1a1a1a] p-8 rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 flex gap-2">
                  <button 
                    onClick={() => handleSpeak(stealthWord?.word)}
                    className={`p-3 rounded-2xl transition-all active:scale-95 ${isSpeaking ? 'bg-blue-600 text-white animate-pulse' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                    title="Listen"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={fetchNewWord}
                    disabled={isFetchingWord}
                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-blue-400 transition-all active:scale-95"
                    title="Next Lesson"
                  >
                    <RefreshCw className={`w-5 h-5 ${isFetchingWord ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Study Session</span>
                  </div>
                  
                  {stealthWord ? (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center gap-4">
                          <h2 className="text-6xl font-black text-white tracking-tighter capitalize">{stealthWord.word}</h2>
                        </div>
                        <p className="text-blue-500 font-bold text-lg mt-2">{stealthWord.phonetic || '/.../'}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {synonyms.map((s, i) => (
                          <span key={i} className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-gray-400 font-bold border border-white/5">
                            {s.word}
                          </span>
                        ))}
                        {synonyms.length > 0 && <span className="text-[10px] text-blue-500/50 font-bold ml-1 self-center underline">Synonyms</span>}
                      </div>

                      <div className="h-[1px] w-20 bg-blue-500/30" />
                      
                      <div className="space-y-4">
                        <p className="text-xl text-gray-300 leading-relaxed font-medium max-w-2xl">
                          "{stealthWord.meanings[0].definitions[0].definition}"
                        </p>
                        {stealthWord.meanings[0].definitions[0].example && (
                          <div className="bg-white/5 p-5 rounded-2xl border-l-4 border-blue-500 shadow-xl">
                            <p className="text-gray-400 text-sm italic leading-relaxed">
                              <span className="font-bold text-white not-italic mr-2">Usage Context:</span> 
                              {stealthWord.meanings[0].definitions[0].example}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-gray-500 animate-pulse font-medium italic">
                      <TrendingUp className="w-5 h-5 mr-2 animate-bounce" /> Connecting to dictionary server...
                    </div>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-[#1a1a1a] p-5 rounded-3xl border border-white/5 flex items-center gap-4 group cursor-help">
                  <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Etymology Trace</p>
                    <p className="text-[10px] text-gray-500">Track word origins and history</p>
                  </div>
                </div>
                <div className="bg-[#1a1a1a] p-5 rounded-3xl border border-white/5 flex items-center gap-4 group cursor-help">
                  <div className="w-10 h-10 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Exam Relevance</p>
                    <p className="text-[10px] text-gray-500">High probability in TOEFL/GRE</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-3xl text-white shadow-2xl shadow-blue-600/20">
                  <h3 className="text-blue-100 text-xs font-bold uppercase mb-4 tracking-widest">Your Streak</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black">14</span>
                    <span className="text-blue-200 font-bold uppercase text-[10px]">Days Active</span>
                  </div>
                </div>
                <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl">
                  <h3 className="text-gray-500 text-xs font-bold uppercase mb-4 tracking-widest">Current Level</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 font-bold">B2</div>
                    <span className="text-white font-bold">Upper Intermediate</span>
                  </div>
                </div>
                <div className="bg-[#1a1a1a] p-6 rounded-3xl border border-white/5 shadow-xl sm:col-span-2 lg:col-span-1">
                  <h3 className="text-gray-500 text-xs font-bold uppercase mb-4 tracking-widest">Next Lesson</h3>
                  <p className="text-white font-bold mb-1">Advanced Phrasal Verbs</p>
                  <p className="text-gray-500 text-xs italic">3:00 PM Tomorrow</p>
                </div>
              </div>

              <div className="bg-[#1a1a1a] rounded-3xl border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recommended Readings</h3>
                  <button className="text-xs text-blue-500 font-bold hover:underline">View All</button>
                </div>
                <div className="p-2">
                  {[
                    { title: 'The subtle art of Business English', time: '5 min read', cat: 'Professional' },
                    { title: 'Idioms you should avoid in 2024', time: '8 min read', cat: 'Cultural' },
                    { title: 'How to prepare for IELTS in 2 weeks', time: '12 min read', cat: 'Exam Prep' }
                  ].map((article, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] rounded-2xl transition-colors group cursor-pointer">
                      <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-blue-500/10 transition-colors text-gray-500 group-hover:text-blue-500">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{article.cat}</p>
                        <p className="text-sm font-bold text-white group-hover:text-blue-500 transition-colors">{article.title}</p>
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">{article.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'grammar' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-[#1a1a1a] p-8 rounded-[40px] border border-white/5 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Grammar Lab</h2>
                    <p className="text-gray-500 text-sm">Submit your sentences for structural analysis</p>
                  </div>
                  {isAnalyzing && (
                    <div className="flex items-center gap-2 text-blue-500">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                      <span className="text-[10px] font-bold uppercase">AI Parsing...</span>
                    </div>
                  )}
                </div>

                <textarea 
                  value={practiceText}
                  onChange={(e) => setPracticeText(e.target.value)}
                  placeholder="Enter your text here to check syntax accuracy..."
                  className="w-full bg-black/30 border border-white/5 rounded-3xl p-6 text-base text-white focus:outline-none focus:border-blue-500/50 transition-all min-h-[200px] resize-none shadow-inner"
                />

                <div className="flex items-center gap-4 mt-6">
                  <button 
                    onClick={handleAnalyze}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    Analyze Structure
                  </button>
                  <button 
                    onClick={() => setPracticeText('')}
                    className="px-6 py-4 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl font-bold transition-all"
                  >
                    Reset
                  </button>
                </div>
              </div>
              
              <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-3xl flex gap-4 items-start">
                <div className="p-2 bg-blue-500/20 rounded-lg shrink-0">
                  <GraduationCap className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1 block">Expert Tip</span>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    When constructing complex sentences, ensure your **parallel structure** remains consistent across all clauses to maintain professional clarity.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-[#1a1a1a] rounded-[40px] border border-white/5 overflow-hidden shadow-2xl">
                <div className="p-8 bg-white/[0.02] border-b border-white/5">
                  <h2 className="text-2xl font-black text-white">Global Leaderboard</h2>
                  <p className="text-gray-500 text-sm">Compete with high-performing learners</p>
                </div>
                <div className="divide-y divide-white/5">
                  {[
                    { name: 'Alex M.', points: '12,450', level: 'C1', streak: '45' },
                    { name: 'Sarah K.', points: '11,200', level: 'B2', streak: '12' },
                    { name: 'Hiroshi T.', points: '9,800', level: 'C2', streak: '89' },
                    { name: 'Elena R.', points: '8,400', level: 'B1', streak: '7' },
                    { name: 'You', points: '4,200', level: 'B2', streak: '14', isMe: true }
                  ].map((user, i) => (
                    <div key={i} className={`flex items-center gap-4 p-6 transition-colors ${user.isMe ? 'bg-blue-600/10' : 'hover:bg-white/[0.01]'}`}>
                      <span className="w-6 text-gray-500 font-bold text-xs">#{i + 1}</span>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${user.isMe ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-white/5 text-gray-400'}`}>
                        {user.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${user.isMe ? 'text-blue-500' : 'text-white'}`}>{user.name}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{user.level} PROFICIENCY</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-white">{user.points}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">XP SCORE</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LMSDashboard;
