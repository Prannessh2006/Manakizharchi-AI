import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Type, 
  Instagram, 
  History, 
  Zap, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  BarChart3,
  Search,
  Activity,
  Lock,
  User,
  LogOut,
  Key,
  FileText,
  MessageCircle,
  Quote
} from 'lucide-react';
import { AnalysisMode, TextAnalysisResult, InstagramAnalysisResult, LoadingState, HistoryItem, InstagramSession } from './types';
import { analyzeRawText, analyzeInstagramUrl } from './services/geminiService';
import { SentimentChart } from './components/SentimentChart';
import { formatDistanceToNow } from 'date-fns';

const App: React.FC = () => {
  // --- State ---
  const [mode, setMode] = useState<AnalysisMode>(AnalysisMode.DASHBOARD);
  
  // Text Mode State
  const [textInput, setTextInput] = useState<string>('');
  const [isRealTime, setIsRealTime] = useState<boolean>(false);
  const [textResult, setTextResult] = useState<TextAnalysisResult | null>(null);
  
  // Instagram Mode State
  const [instaUrl, setInstaUrl] = useState<string>('');
  const [instaResult, setInstaResult] = useState<InstagramAnalysisResult | null>(null);
  const [session, setSession] = useState<InstagramSession | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  
  // Login Form State
  const [loginForm, setLoginForm] = useState({ username: '', sessionId: '' });

  // Common State
  const [loading, setLoading] = useState<LoadingState>({ isLoading: false, message: '' });
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Debounce ref for real-time analysis
  // Using ReturnType<typeof setTimeout> ensures compatibility across environments (Node/Browser)
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Effects ---

  // Load History & Session on Mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('naveena_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load history");
      }
    }

    const savedSession = localStorage.getItem('naveena_session');
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch (e) {
        console.error("Failed to load session");
      }
    }
  }, []);

  // Save History on Update
  useEffect(() => {
    localStorage.setItem('naveena_history', JSON.stringify(history));
  }, [history]);

  // Real-time Text Analysis Debounce
  useEffect(() => {
    if (mode === AnalysisMode.TEXT && isRealTime && textInput.trim().length > 5) {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      
      setLoading({ isLoading: true, message: 'Real-time analysis...' });
      
      debounceTimeout.current = setTimeout(async () => {
        try {
          const result = await analyzeRawText(textInput);
          setTextResult(result);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading({ isLoading: false, message: '' });
        }
      }, 1000); 
    }
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [textInput, isRealTime, mode]);

  // --- Handlers ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.username || !loginForm.sessionId) {
      setError("Please provide both Username and Session ID.");
      return;
    }
    
    const newSession: InstagramSession = {
      username: loginForm.username,
      sessionId: loginForm.sessionId,
      avatarUrl: `https://ui-avatars.com/api/?name=${loginForm.username}&background=E1306C&color=fff`
    };
    
    setSession(newSession);
    localStorage.setItem('naveena_session', JSON.stringify(newSession));
    setShowLoginModal(false);
    setLoginForm({ username: '', sessionId: '' });
    setError(null);
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('naveena_session');
    setMode(AnalysisMode.DASHBOARD);
  };

  const addToHistory = (type: 'TEXT' | 'INSTAGRAM', preview: string, result: any) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      date: Date.now(),
      type,
      preview: preview.substring(0, 60) + (preview.length > 60 ? '...' : ''),
      result
    };
    setHistory(prev => [newItem, ...prev]);
  };

  const handleManualAnalyzeText = async () => {
    if (!textInput.trim()) return;
    setError(null);
    setLoading({ isLoading: true, message: 'Analyzing sentiment...' });
    try {
      const result = await analyzeRawText(textInput);
      setTextResult(result);
      addToHistory('TEXT', textInput, result);
    } catch (e) {
      setError('Analysis failed. Please try again.');
    } finally {
      setLoading({ isLoading: false, message: '' });
    }
  };

  const handleAnalyzeInsta = async () => {
    if (!instaUrl.trim()) {
      setError("Please enter a valid URL.");
      return;
    }
    if (!session) {
      setShowLoginModal(true);
      return;
    }

    setError(null);
    setLoading({ isLoading: true, message: `Authenticating as @${session.username}...` });
    
    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 800));
    setLoading({ isLoading: true, message: 'Extracting Caption & Comments...' });

    try {
      const result = await analyzeInstagramUrl(instaUrl);
      setInstaResult(result);
      addToHistory('INSTAGRAM', instaUrl, result);
    } catch (e) {
      setError('Could not analyze URL. The post might be private or unreachable.');
    } finally {
      setLoading({ isLoading: false, message: '' });
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('naveena_history');
  };

  const loadFromHistory = (item: HistoryItem) => {
    if (item.type === 'TEXT') {
      setMode(AnalysisMode.TEXT);
      setTextInput(item.preview); 
      setTextResult(item.result as TextAnalysisResult);
    } else {
      setMode(AnalysisMode.INSTAGRAM);
      setInstaUrl(item.preview);
      setInstaResult(item.result as InstagramAnalysisResult);
    }
  };

  // --- Components ---

  const SidebarItem = ({ active, icon: Icon, label, onClick, locked = false }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden ${
        active 
          ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-900/20' 
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
      }`}
    >
      <Icon className="w-5 h-5 z-10" />
      <span className="font-medium z-10">{label}</span>
      {locked && <Lock className="w-4 h-4 absolute right-4 text-slate-600" />}
    </button>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen relative">
      
      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-8 shadow-2xl relative overflow-hidden">
             {/* Decorative background */}
             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-500 via-pink-500 to-purple-600"></div>
             
             <div className="flex justify-center mb-6">
               <div className="w-16 h-16 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-2xl flex items-center justify-center p-0.5">
                 <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center">
                    <Instagram className="w-8 h-8 text-white" />
                 </div>
               </div>
             </div>

             <h2 className="text-2xl font-bold text-center text-white mb-2">Connect Instagram</h2>
             <p className="text-slate-400 text-center text-sm mb-8">Enter your credentials to enable deep insights.</p>

             <form onSubmit={handleLogin} className="space-y-4">
                <div>
                   <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Username</label>
                   <div className="relative mt-1">
                     <User className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                     <input 
                        type="text" 
                        placeholder="instagram_user"
                        value={loginForm.username}
                        onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-pink-500 outline-none"
                     />
                   </div>
                </div>
                <div>
                   <label className="text-xs font-semibold text-slate-500 uppercase ml-1">Session ID / Auth Token</label>
                   <div className="relative mt-1">
                     <Key className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                     <input 
                        type="password" 
                        placeholder="sessionid=..."
                        value={loginForm.sessionId}
                        onChange={e => setLoginForm({...loginForm, sessionId: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white focus:ring-2 focus:ring-pink-500 outline-none"
                     />
                   </div>
                </div>

                {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setShowLoginModal(false)}
                    className="flex-1 py-3 text-slate-400 hover:text-white transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-pink-900/20 transition-all"
                  >
                    Connect
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-72 bg-slate-950/80 border-r border-slate-800 p-6 flex flex-col gap-8 backdrop-blur-xl fixed md:relative z-20 h-auto md:h-screen">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-gradient-to-tr from-blue-500 to-purple-600 p-2 rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
              Manakizharchi AI
            </h1>
            <p className="text-xs text-slate-500">Sentiment AI</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={mode === AnalysisMode.DASHBOARD} 
            onClick={() => setMode(AnalysisMode.DASHBOARD)} 
          />
          <SidebarItem 
            icon={Type} 
            label="Text Analyzer" 
            active={mode === AnalysisMode.TEXT} 
            onClick={() => setMode(AnalysisMode.TEXT)} 
          />
          <SidebarItem 
            icon={Instagram} 
            label="Instagram Scan" 
            active={mode === AnalysisMode.INSTAGRAM} 
            onClick={() => setMode(AnalysisMode.INSTAGRAM)} 
            locked={!session}
          />
        </nav>

        {/* User Session Info */}
        <div className="mt-auto pt-6 border-t border-slate-800">
          {session ? (
            <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={session.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full ring-2 ring-pink-500/50" />
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">@{session.username}</p>
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Connected
                  </p>
                </div>
              </div>
              <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
             <button 
                onClick={() => setShowLoginModal(true)}
                className="w-full py-3 rounded-xl border border-dashed border-slate-700 text-slate-400 text-sm hover:bg-slate-800/50 hover:text-white transition-all flex items-center justify-center gap-2"
             >
               <Instagram className="w-4 h-4" /> Connect Account
             </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          
          {/* Header Area */}
          <header className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-white">
              {mode === AnalysisMode.DASHBOARD && 'Overview'}
              {mode === AnalysisMode.TEXT && 'Text Sentiment Analysis'}
              {mode === AnalysisMode.INSTAGRAM && 'Instagram Intelligence'}
            </h2>
            <div className="flex items-center gap-3">
               {loading.isLoading && (
                 <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm animate-pulse">
                   <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                   {loading.message}
                 </div>
               )}
            </div>
          </header>

          {/* DASHBOARD VIEW */}
          {mode === AnalysisMode.DASHBOARD && (
            <div className="space-y-8 animate-fadeIn">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={() => setMode(AnalysisMode.TEXT)}
                  className="glass-panel p-6 rounded-2xl text-left hover:bg-slate-800/50 transition-all group border-l-4 border-l-blue-500"
                >
                  <div className="bg-blue-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Type className="text-blue-400 w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">Analyze Raw Text</h3>
                  <p className="text-slate-400 text-sm">Real-time VADER-style sentiment analysis for any text block.</p>
                </button>

                <button 
                   onClick={() => session ? setMode(AnalysisMode.INSTAGRAM) : setShowLoginModal(true)}
                   className="glass-panel p-6 rounded-2xl text-left hover:bg-slate-800/50 transition-all group border-l-4 border-l-pink-500 relative overflow-hidden"
                >
                   {!session && (
                      <div className="absolute top-4 right-4 bg-slate-900/80 px-2 py-1 rounded text-xs text-slate-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Locked
                      </div>
                   )}
                   <div className="bg-pink-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Instagram className="text-pink-400 w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">Instagram Insights</h3>
                  <p className="text-slate-400 text-sm">Analyze audience reaction and emotion via Post URLs.</p>
                </button>
              </div>

              {/* Recent History */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-slate-400"/> Recent Activity
                  </h3>
                  {history.length > 0 && (
                    <button 
                      onClick={clearHistory}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-3 py-1 rounded-full hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Clear History
                    </button>
                  )}
                </div>
                
                {history.length === 0 ? (
                  <div className="glass-panel rounded-2xl p-12 text-center border-dashed border-slate-700">
                    <div className="bg-slate-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-slate-400">No analysis history yet. Start exploring!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {history.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => loadFromHistory(item)}
                        className="glass-card p-4 rounded-xl flex items-center justify-between hover:bg-slate-800/40 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.type === 'TEXT' ? 'bg-blue-500/10 text-blue-400' : 'bg-pink-500/10 text-pink-400'}`}>
                            {item.type === 'TEXT' ? <Type className="w-5 h-5"/> : <Instagram className="w-5 h-5"/>}
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-white truncate max-w-md">{item.preview}</h4>
                            <p className="text-xs text-slate-500">{formatDistanceToNow(item.date, { addSuffix: true })}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TEXT ANALYSIS VIEW */}
          {mode === AnalysisMode.TEXT && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn">
              <div className="lg:col-span-5 space-y-4">
                <div className="glass-panel p-6 rounded-2xl">
                   <div className="flex justify-between items-center mb-4">
                     <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Input Text</label>
                     <button
                        onClick={() => setIsRealTime(!isRealTime)}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all ${isRealTime ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                     >
                       <Zap className={`w-3 h-3 ${isRealTime ? 'fill-current' : ''}`} />
                       Real-time {isRealTime ? 'ON' : 'OFF'}
                     </button>
                   </div>
                   <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Type something to analyze..."
                      className="w-full h-64 bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all placeholder:text-slate-600"
                    />
                    {!isRealTime && (
                      <button
                        onClick={handleManualAnalyzeText}
                        disabled={loading.isLoading}
                        className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-lg shadow-blue-900/20 transition-all flex justify-center items-center gap-2"
                      >
                         {loading.isLoading ? 'Analyzing...' : 'Analyze Sentiment'}
                      </button>
                    )}
                </div>
              </div>
              
              <div className="lg:col-span-7">
                {textResult ? (
                   <div className="glass-panel p-6 rounded-2xl space-y-6 animate-fadeIn">
                      <div className="flex justify-between items-end border-b border-slate-700 pb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white">Sentiment Results</h3>
                          <p className="text-slate-400 text-sm mt-1">{textResult.explanation}</p>
                        </div>
                        <div className={`text-2xl font-bold ${(textResult.scores?.compound ?? 0) > 0.05 ? 'text-green-400' : (textResult.scores?.compound ?? 0) < -0.05 ? 'text-red-400' : 'text-slate-400'}`}>
                          {((textResult.scores?.compound ?? 0) * 100).toFixed(0)}%
                        </div>
                      </div>
                      {textResult.scores && <SentimentChart scores={textResult.scores} />}
                   </div>
                ) : (
                  <div className="h-full glass-card rounded-2xl flex flex-col items-center justify-center text-slate-600 p-12">
                    <Activity className="w-16 h-16 mb-4 opacity-20" />
                    <p>Start typing or click analyze</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* INSTAGRAM VIEW */}
          {mode === AnalysisMode.INSTAGRAM && (
             <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
               {!session ? (
                 <div className="glass-panel p-12 rounded-2xl text-center space-y-6">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                      <Lock className="w-10 h-10 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">Authentication Required</h3>
                      <p className="text-slate-400 max-w-md mx-auto">To perform advanced Instagram analysis, you must connect your account session. This ensures secure access to public data.</p>
                    </div>
                    <button 
                      onClick={() => setShowLoginModal(true)}
                      className="px-8 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-pink-900/20 transition-all"
                    >
                      Connect Account
                    </button>
                 </div>
               ) : (
                 <>
                   {/* Search Bar */}
                   <div className="glass-panel p-1 rounded-2xl flex items-center shadow-2xl shadow-pink-900/20 relative z-10">
                      <div className="pl-4 pr-2 text-pink-500">
                        <Instagram className="w-6 h-6" />
                      </div>
                      <input 
                        type="text"
                        value={instaUrl}
                        onChange={(e) => setInstaUrl(e.target.value)}
                        placeholder="Paste Instagram Post URL here..."
                        className="w-full bg-transparent border-none text-white p-4 focus:ring-0 placeholder:text-slate-500"
                      />
                      <button
                        onClick={handleAnalyzeInsta}
                        disabled={loading.isLoading}
                        className="bg-pink-600 hover:bg-pink-500 text-white px-8 py-3 rounded-xl font-medium m-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {loading.isLoading ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        Analyze
                      </button>
                   </div>

                   {error && (
                     <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl text-sm text-center">
                       {error}
                     </div>
                   )}

                   {instaResult && (
                     <div className="glass-panel p-0 rounded-2xl overflow-hidden animate-fadeIn shadow-2xl shadow-pink-900/10 border border-pink-500/20">
                        {/* Card Header - Like a generated report */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 border-b border-slate-700 flex justify-between items-start">
                          <div>
                            <div className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-1">Analysis Report</div>
                            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                              {instaResult.inferredContentSummary ? "Audience Insights" : "Post Analysis"}
                              <span className={`text-xs px-2 py-0.5 rounded border ${(instaResult.averageSentimentScore ?? 0) > 0 ? 'border-green-500 text-green-400' : 'border-red-500 text-red-400'}`}>
                                {(instaResult.averageSentimentScore ?? 0).toFixed(2)} Score
                              </span>
                            </h3>
                          </div>
                          <div className="flex gap-2">
                            {instaResult.emotionalCategory.map((cat, i) => (
                              <span key={i} className="px-3 py-1 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-full text-xs font-bold shadow-lg">
                                {cat}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="p-8 space-y-8">
                           {/* Main Narrative Explanation - Emphasized */}
                           <div className="flex gap-4">
                              <div className="min-w-[4px] bg-gradient-to-b from-pink-500 to-purple-600 rounded-full"></div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-2">Detailed Interpretation</h4>
                                <p className="text-lg text-slate-200 leading-relaxed font-light">
                                  {instaResult.explanation}
                                </p>
                              </div>
                           </div>
                           
                           {/* Analyzed Content: Caption & Comments (New Section) */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/40 rounded-xl p-6 border border-slate-800">
                              {/* Caption */}
                              <div className="space-y-3">
                                 <div className="flex items-center gap-2 text-slate-400">
                                   <FileText className="w-4 h-4" />
                                   <h5 className="text-xs font-bold uppercase tracking-wide">Analyzed Caption</h5>
                                 </div>
                                 <div className="text-sm text-slate-300 italic bg-slate-950/50 p-4 rounded-lg border border-slate-800/50 relative">
                                    <Quote className="w-4 h-4 text-slate-600 absolute top-2 left-2 opacity-50" />
                                    <p className="pl-4">{instaResult.caption || "Caption could not be extracted directly."}</p>
                                 </div>
                              </div>
                              
                              {/* Comments */}
                              <div className="space-y-3">
                                 <div className="flex items-center gap-2 text-slate-400">
                                   <MessageCircle className="w-4 h-4" />
                                   <h5 className="text-xs font-bold uppercase tracking-wide">Community Reaction</h5>
                                 </div>
                                 <div className="space-y-2">
                                    {instaResult.sampleComments && instaResult.sampleComments.length > 0 ? (
                                      instaResult.sampleComments.map((comment, i) => (
                                        <div key={i} className="text-xs text-slate-400 bg-slate-800/50 px-3 py-2 rounded-lg border-l-2 border-pink-500/30">
                                          "{comment}"
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-slate-500 italic">No specific comments found, analysis based on general context.</p>
                                    )}
                                 </div>
                              </div>
                           </div>

                           {/* Visual Meter */}
                           <div>
                              <div className="flex justify-between text-xs text-slate-500 mb-2 font-medium uppercase">
                                <span>Strongly Negative (-1)</span>
                                <span>Neutral (0)</span>
                                <span>Strongly Positive (+1)</span>
                              </div>
                              <div className="h-4 bg-slate-800 rounded-full relative overflow-hidden">
                                 {/* Center Marker */}
                                 <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-600 transform -translate-x-1/2 z-10"></div>
                                 
                                 {/* Bar */}
                                 <div 
                                    className={`absolute top-0 bottom-0 transition-all duration-1000 ease-out rounded-full ${(instaResult.averageSentimentScore ?? 0) >= 0 ? 'left-1/2 bg-green-500' : 'right-1/2 bg-red-500'}`}
                                    style={{ width: `${Math.abs(instaResult.averageSentimentScore ?? 0) * 50}%` }}
                                 ></div>
                              </div>
                           </div>
                        </div>

                        {/* Footer Sources */}
                        {instaResult.sources && instaResult.sources.length > 0 && (
                          <div className="bg-slate-950/50 p-4 border-t border-slate-800 flex flex-wrap gap-2 items-center">
                            <span className="text-xs text-slate-600 font-medium">Data Sources:</span>
                            {instaResult.sources.slice(0, 3).map((source, i) => (
                              <a key={i} href={source} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white transition-colors bg-slate-800/50 px-2 py-1 rounded">
                                <ExternalLink className="w-2.5 h-2.5" /> {new URL(source).hostname}
                              </a>
                            ))}
                          </div>
                        )}
                     </div>
                   )}
                 </>
               )}
             </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;