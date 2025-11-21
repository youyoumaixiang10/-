import React, { useState, useEffect } from 'react';
import { Screen, Master, Message, SavedSession } from './types';
import { MASTERS } from './constants';
import { recommendMasters, getMasterAdvice } from './services/geminiService';
import { Button } from './components/Button';
import { MasterCard } from './components/MasterCard';

const STORAGE_KEY = 'master_consultation_session_v1';
const HISTORY_KEY = 'master_consultation_history_v1';

const App: React.FC = () => {
  // --- State Initialization ---
  
  // Load active session state
  const loadState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to load session", e);
    }
    return null;
  };

  // Load history
  const loadHistory = (): SavedSession[] => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  };

  const savedState = loadState();

  const [screen, setScreen] = useState<Screen>(savedState?.screen || Screen.WELCOME);
  const [problem, setProblem] = useState(savedState?.problem || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendedIds, setRecommendedIds] = useState<string[]>(savedState?.recommendedIds || []);
  const [selectedMasterIds, setSelectedMasterIds] = useState<string[]>(savedState?.selectedMasterIds || []);
  const [messages, setMessages] = useState<Message[]>(savedState?.messages || []);
  const [isConsulting, setIsConsulting] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');
  
  // History & Session Management
  const [history, setHistory] = useState<SavedSession[]>(loadHistory);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(savedState?.currentSessionId || null);
  const [showHistory, setShowHistory] = useState(false);

  // --- Persistence Effects ---

  // Save Active State
  useEffect(() => {
    const stateToSave = {
      screen,
      problem,
      recommendedIds,
      selectedMasterIds,
      messages,
      currentSessionId
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [screen, problem, recommendedIds, selectedMasterIds, messages, currentSessionId]);

  // Save History List
  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  // Sync Current Session to History
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setHistory(prev => {
        const existingIdx = prev.findIndex(s => s.id === currentSessionId);
        const sessionData: SavedSession = {
          id: currentSessionId,
          timestamp: Date.now(),
          problem,
          selectedMasterIds,
          messages
        };
        
        if (existingIdx >= 0) {
          const newHistory = [...prev];
          newHistory[existingIdx] = sessionData;
          // Move to top
          newHistory.splice(existingIdx, 1);
          newHistory.unshift(sessionData);
          return newHistory;
        } else {
          return [sessionData, ...prev];
        }
      });
    }
  }, [messages, currentSessionId, problem, selectedMasterIds]);


  // --- Handlers ---

  const generateSessionId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  const handleProblemSubmit = () => {
    if (!problem.trim()) return;
    
    // If we don't have a session ID yet (new chat), create one
    if (!currentSessionId) {
      setCurrentSessionId(generateSessionId());
    }
    
    // IMMEDIATE NAVIGATION
    setScreen(Screen.SELECTION);
    setIsAnalyzing(true);
    setRecommendedIds([]); 
    setSelectedMasterIds([]); 

    recommendMasters(problem)
      .then(recs => {
        setRecommendedIds(recs);
        setSelectedMasterIds(recs);
      })
      .catch(e => {
        console.error(e);
        const fallback = [MASTERS[0].id, MASTERS[1].id, MASTERS[2].id];
        setRecommendedIds(fallback);
        setSelectedMasterIds(fallback);
      })
      .finally(() => {
        setIsAnalyzing(false);
      });
  };

  const toggleMaster = (id: string) => {
    if (selectedMasterIds.includes(id)) {
      setSelectedMasterIds(prev => prev.filter(mid => mid !== id));
    } else {
      if (selectedMasterIds.length < 3) {
        setSelectedMasterIds(prev => [...prev, id]);
      }
    }
  };

  const startConsultation = async () => {
    setScreen(Screen.CONSULTATION);
    setIsConsulting(true);
    setMessages([]); // Reset visible messages for the new flow
    
    // Note: In a loaded session, we might not want to clear messages if they exist.
    // But startConsultation implies "Starting the Roundtable". 
    // If continuing, we skip this. 
    // However, the UI flow is Selection -> Consultation. 
    // If we loaded a session, we are usually already at CONSULTATION or just need to restore messages.
    
    // Visual: Add user problem
    const initialUserMsg: Message = {
      role: 'user',
      text: problem,
      timestamp: Date.now()
    };
    setMessages([initialUserMsg]);

    const selectedMasters = MASTERS.filter(m => selectedMasterIds.includes(m.id));
    
    const promises = selectedMasters.map(async (master) => {
      const advice = await getMasterAdvice(master, problem, []);
      return { masterId: master.id, text: advice };
    });

    const results = await Promise.all(promises);
    
    const newMessages: Message[] = results.map(res => ({
      role: 'model',
      text: res.text,
      masterId: res.masterId,
      timestamp: Date.now()
    }));

    setMessages(prev => [...prev, ...newMessages]);
    setIsConsulting(false);
  };

  const handleFollowUp = async () => {
    if (!followUpInput.trim() || isConsulting) return;
    
    const question = followUpInput;
    setFollowUpInput('');
    setIsConsulting(true);

    const userMsg: Message = { role: 'user', text: question, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    const selectedMasters = MASTERS.filter(m => selectedMasterIds.includes(m.id));
    
    const promises = selectedMasters.map(async (master) => {
      const relevantHistory = messages.map(m => {
        if (m.role === 'user') return m;
        if (m.masterId === master.id) return m; 
        const otherMasterName = MASTERS.find(mx => mx.id === m.masterId)?.name;
        return {
            role: 'user' as const,
            text: `[背景: ${otherMasterName} 说]: ${m.text}`,
            timestamp: m.timestamp
        };
      });
      
      const historyForCall = [...relevantHistory, userMsg];

      const advice = await getMasterAdvice(master, question, historyForCall);
      return { masterId: master.id, text: advice };
    });

    const results = await Promise.all(promises);

    const newResponses: Message[] = results.map(res => ({
      role: 'model',
      text: res.text,
      masterId: res.masterId,
      timestamp: Date.now()
    }));

    setMessages(prev => [...prev, ...newResponses]);
    setIsConsulting(false);
  };

  const resetApp = () => {
    // Resetting the *View* to welcome, generating potential for a new session.
    setScreen(Screen.WELCOME);
    setProblem('');
    setRecommendedIds([]);
    setSelectedMasterIds([]);
    setMessages([]);
    setFollowUpInput('');
    setCurrentSessionId(null); // Ready for new session
  };

  const handleClearChat = () => {
    if (window.confirm('确定要清空当前对话吗？此操作无法撤销。')) {
      setMessages([]);
    }
  };

  const loadSession = (session: SavedSession) => {
    setCurrentSessionId(session.id);
    setProblem(session.problem);
    setSelectedMasterIds(session.selectedMasterIds);
    setMessages(session.messages);
    setRecommendedIds([]); // Optional: could store this too if needed
    setScreen(Screen.CONSULTATION);
    setShowHistory(false);
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('删除此记录？')) {
      setHistory(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
        resetApp();
      }
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    let content = `顶级大师智囊团 - 对话记录\n时间: ${new Date().toLocaleString()}\n问题: ${problem}\n\n`;
    content += "================================================\n\n";
    messages.forEach(msg => {
      const isUser = msg.role === 'user';
      const name = isUser ? '我' : MASTERS.find(m => m.id === msg.masterId)?.name || '大师';
      const time = new Date(msg.timestamp).toLocaleTimeString();
      content += `[${name}] ${time}:\n${msg.text}\n\n------------------------------------------------\n\n`;
    });
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `master-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reselectMasters = () => {
    setScreen(Screen.SELECTION);
  };

  // --- Components ---

  const HistorySidebar = () => (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${showHistory ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setShowHistory(false)}
      />
      
      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-800 shadow-2xl transform transition-transform duration-300 z-[70] ${showHistory ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <h3 className="font-heading text-lg text-slate-200 font-bold">历史咨询</h3>
          <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="text-center text-slate-600 mt-10 text-sm">暂无历史记录</div>
          ) : (
            history.map(session => (
              <div 
                key={session.id}
                onClick={() => loadSession(session)}
                className={`group relative p-3 rounded-lg border border-slate-800 cursor-pointer transition-all hover:bg-slate-800 hover:border-slate-700 ${currentSessionId === session.id ? 'bg-slate-800 border-slate-700 ring-1 ring-slate-600' : 'bg-slate-900/50'}`}
              >
                 <div className="pr-6">
                    <p className="text-sm text-slate-300 font-medium line-clamp-2 mb-1.5 leading-snug">
                      {session.problem || "未命名咨询"}
                    </p>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] text-slate-500 font-mono">
                         {new Date(session.timestamp).toLocaleDateString()}
                       </span>
                       <div className="flex -space-x-1">
                          {session.selectedMasterIds.slice(0,3).map(mid => {
                             const m = MASTERS.find(master => master.id === mid);
                             return m ? (
                               <div key={mid} className={`w-3 h-3 rounded-full ${m.color} border border-slate-800`} />
                             ) : null;
                          })}
                       </div>
                    </div>
                 </div>
                 
                 <button 
                   onClick={(e) => deleteSession(e, session.id)}
                   className="absolute right-2 top-2 text-slate-600 hover:text-rose-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                   title="删除"
                 >
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                   </svg>
                 </button>
              </div>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-slate-800 bg-slate-950">
           <Button 
             variant="secondary" 
             fullWidth 
             onClick={() => {
               resetApp();
               setShowHistory(false);
             }}
             className="text-sm py-2"
           >
             + 发起新咨询
           </Button>
        </div>
      </div>
    </>
  );

  const renderWelcome = () => (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 max-w-2xl mx-auto text-center relative z-10">
      {/* History Toggle - Top Right */}
      <div className="absolute top-6 right-6">
        <button 
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-slate-800/50"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">历史</span>
        </button>
      </div>

      {/* Decorative Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-slate-400/5 blur-[120px] rounded-full pointer-events-none -z-10 mix-blend-screen"></div>
      
      <div className="mb-8 opacity-90 relative group">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-white/10 blur-[60px] rounded-full pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/10 blur-[30px] rounded-full pointer-events-none mix-blend-overlay"></div>
        <svg className="w-16 h-16 mx-auto text-slate-200 relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      </div>

      <h1 className="font-heading text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 mb-4 tracking-tight drop-shadow-lg">
        顶级大师智囊团
      </h1>
      <p className="font-content text-lg text-slate-400 mb-12 leading-relaxed max-w-lg mx-auto">
        汇聚历史顶尖智慧——从<span className="text-slate-300 font-semibold whitespace-nowrap">巴菲特</span>到<span className="text-slate-300 font-semibold whitespace-nowrap">苏格拉底</span><br/>为您解答人生与职场的深层困惑。
      </p>
      
      <div className="w-full bg-slate-900/60 p-1 rounded-2xl border border-slate-700/50 shadow-[0_0_40px_rgba(0,0,0,0.3)] backdrop-blur-xl transition-all hover:border-slate-600 hover:shadow-[0_0_50px_rgba(0,0,0,0.4)]">
        <textarea
          className="w-full bg-transparent text-slate-100 p-5 text-lg min-h-[140px] focus:outline-none resize-none placeholder-slate-500/70 font-light leading-relaxed"
          placeholder="请详细描述您的困惑，例如：
“我该如何在工作与生活中找到平衡？”
“如何做出艰难的商业决策？”"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
        />
        <div className="px-4 py-3 border-t border-slate-700/40 flex justify-between items-center bg-slate-950/30 rounded-b-xl">
           <span className="text-xs text-slate-500 font-mono tracking-wide">
             {problem.length > 0 ? `${problem.length} 字` : '越具体，回答越深刻'}
           </span>
           <Button 
             onClick={handleProblemSubmit} 
             disabled={!problem.trim()}
             className="px-8 shadow-lg"
           >
             大师咨询
           </Button>
        </div>
      </div>
      
      <div className="mt-12 flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity duration-300">
        <div className="flex -space-x-3">
          {MASTERS.slice(0,5).map((m, i) => (
            <div 
              key={m.id} 
              className={`w-9 h-9 rounded-full ${m.color} border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold shadow-lg z-[${10-i}]`}
            >
              {m.avatarInitials}
            </div>
          ))}
        </div>
        <span className="text-slate-500 text-xs tracking-wider font-medium">已集结 10 位历史智者</span>
      </div>
    </div>
  );

  const renderSelection = () => {
    // Sort masters so recommended ones appear at the top
    const sortedMasters = [...MASTERS].sort((a, b) => {
      const aRecommended = recommendedIds.includes(a.id);
      const bRecommended = recommendedIds.includes(b.id);
      if (aRecommended && !bRecommended) return -1;
      if (!aRecommended && bRecommended) return 1;
      return 0;
    });

    return (
      <div className="min-h-screen px-4 py-8 max-w-5xl mx-auto relative z-10">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-heading text-3xl font-bold text-white mb-2 tracking-tight">智囊团集结</h2>
            <div className="flex items-center gap-2">
              {isAnalyzing ? (
                  <span className="text-amber-400 text-sm flex items-center gap-2 animate-pulse">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    正在根据您的问题匹配最合适的大师...
                  </span>
              ) : (
                  <p className="text-slate-400 text-sm">根据您的问题，系统已为您推荐最合适的人选。</p>
              )}
            </div>
          </div>
          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 px-4 py-2 rounded-full flex items-center gap-3 shadow-lg">
            <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">已选席位</span>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className={`w-2 h-2 rounded-full transition-colors duration-300 ${i < selectedMasterIds.length ? 'bg-amber-600/80 shadow-[0_0_8px_rgba(217,119,6,0.6)]' : 'bg-slate-700'}`} />
              ))}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-32">
          {sortedMasters.map(master => (
            <MasterCard 
              key={master.id}
              master={master}
              isSelected={selectedMasterIds.includes(master.id)}
              isRecommended={recommendedIds.includes(master.id)}
              onToggle={toggleMaster}
              disabled={selectedMasterIds.length >= 3 && !selectedMasterIds.includes(master.id)}
            />
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent z-50 pointer-events-none">
          <div className="max-w-4xl mx-auto flex gap-4 pointer-events-auto">
            <Button variant="outline" onClick={() => setScreen(Screen.WELCOME)} className="flex-1 md:flex-none backdrop-blur-sm bg-slate-900/50 border-slate-700/80">
              返回修改
            </Button>
            <Button 
              onClick={startConsultation} 
              disabled={selectedMasterIds.length === 0} 
              fullWidth 
              className="md:w-auto md:px-12 shadow-xl"
            >
              {isAnalyzing && selectedMasterIds.length === 0 ? '匹配大师中...' : '开始圆桌会议'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderConsultation = () => (
    <div className="min-h-screen flex flex-col max-w-5xl mx-auto relative z-10">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-lg border-b border-slate-800/50 px-6 py-4 flex justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
            {/* Home Button */}
            <button 
                onClick={resetApp} 
                className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="返回首页"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            </button>
            <div className="h-6 w-px bg-slate-800 mx-1"></div>
            <div className="flex -space-x-3 overflow-hidden py-1">
            {MASTERS.filter(m => selectedMasterIds.includes(m.id)).map(m => (
                <div key={m.id} className={`w-10 h-10 rounded-full border-2 border-slate-950 ${m.color} flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-md`} title={m.name}>
                {m.avatarInitials}
                </div>
            ))}
            </div>
            <h2 className="hidden md:block font-heading text-lg text-slate-200 ml-2">圆桌会议进行中</h2>
        </div>

        <div className="flex gap-2 flex-wrap justify-end items-center">
          <button onClick={reselectMasters} className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white px-3 py-2 border border-slate-700/50 rounded-lg hover:bg-slate-800 transition bg-slate-900/50">
             <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
             </svg>
             调整阵容
          </button>
          <button onClick={handleExportChat} className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white px-3 py-2 border border-slate-700/50 rounded-lg hover:bg-slate-800 transition bg-slate-900/50">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            保存
          </button>
          <button 
            onClick={() => setShowHistory(true)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="历史记录"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 pb-40">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const master = !isUser && msg.masterId ? MASTERS.find(m => m.id === msg.masterId) : null;
          
          return (
            <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[95%] md:max-w-[85%] ${isUser ? 'ml-auto' : ''}`}>
                {!isUser && master && (
                  <div className="flex items-center gap-2.5 mb-2 ml-1">
                     <div className={`w-5 h-5 rounded-full ${master.color} flex items-center justify-center text-[9px] font-bold text-white shadow-sm`}>
                        {master.avatarInitials}
                     </div>
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{master.name}</span>
                  </div>
                )}
                <div className={`
                  px-6 py-5 rounded-2xl leading-relaxed text-[15px] md:text-base shadow-sm
                  ${isUser 
                    ? 'bg-gradient-to-br from-slate-800 to-slate-900 text-slate-100 rounded-tr-none border border-slate-700' 
                    : 'bg-slate-900/80 border border-slate-800 text-slate-300 rounded-tl-none font-content'
                  }
                `}>
                  {msg.text.split('\n').map((line, i) => (
                    <p key={i} className="mb-3 last:mb-0">{line}</p>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        
        {isConsulting && (
           <div className="flex justify-start animate-pulse">
             <div className="bg-slate-900/50 border border-slate-800/50 px-6 py-4 rounded-2xl rounded-tl-none flex items-center gap-2">
               <div className="w-1.5 h-1.5 bg-slate-500 rounded-full typing-dot"></div>
               <div className="w-1.5 h-1.5 bg-slate-500 rounded-full typing-dot"></div>
               <div className="w-1.5 h-1.5 bg-slate-500 rounded-full typing-dot"></div>
               <span className="text-xs text-slate-500 ml-2">大师正在思考...</span>
             </div>
           </div>
        )}
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent p-4 md:p-6 z-50">
        <div className="max-w-4xl mx-auto relative shadow-2xl rounded-full">
          <div className="absolute -inset-1 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-full blur opacity-40"></div>
          <input
            type="text"
            value={followUpInput}
            onChange={(e) => setFollowUpInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFollowUp()}
            placeholder="继续向大师追问..."
            className="relative w-full bg-slate-900 border border-slate-700 rounded-full pl-8 pr-14 py-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 transition-all shadow-inner"
            disabled={isConsulting}
          />
          <button 
            onClick={handleFollowUp}
            disabled={!followUpInput.trim() || isConsulting}
            className="absolute right-2 top-2 bottom-2 w-11 h-11 bg-gradient-to-b from-slate-200 to-slate-400 text-slate-900 rounded-full flex items-center justify-center hover:from-white hover:to-slate-200 disabled:opacity-50 disabled:bg-slate-700 disabled:text-slate-500 transition-all shadow-md"
          >
            <svg className="w-5 h-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-slate-700 selection:text-slate-100 font-sans relative overflow-hidden">
      {/* Global Ambient Gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black pointer-events-none"></div>
      
      <HistorySidebar />
      
      {screen === Screen.WELCOME && renderWelcome()}
      {screen === Screen.SELECTION && renderSelection()}
      {screen === Screen.CONSULTATION && renderConsultation()}
    </div>
  );
};

export default App;