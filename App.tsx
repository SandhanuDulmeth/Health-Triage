import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, HeartPulse, Trash2, RotateCcw, Activity, MapPin, X, Sun, Moon, Volume2, Search, ArrowRight, ShieldCheck, Stethoscope } from 'lucide-react';
import Recorder from './components/Recorder';
import { MediaAttachment, AppState, ChatMessage } from './types';
import { analyzeHealthCondition } from './services/geminiService';

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [painLevel, setPainLevel] = useState<number | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<AppState>(AppState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Toggle Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log("Location access denied or failed", error);
        }
      );
    }
  }, []);

  const handleCapture = (attachment: MediaAttachment) => {
    setAttachments(prev => [...prev, attachment]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const reset = () => {
    setInputText('');
    setAttachments([]);
    setPainLevel(null);
    setMessages([]);
    setStatus(AppState.IDLE);
    setErrorMessage(null);
    window.speechSynthesis.cancel();
  };

  const handleSubmit = async (isFollowUp = false) => {
    if (!inputText && attachments.length === 0 && !isFollowUp) return;
    if (isFollowUp && !inputText) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      attachments: isFollowUp ? [] : attachments,
      painLevel: isFollowUp ? null : painLevel,
      timestamp: Date.now()
    };

    const newHistory = [...messages, newMessage];
    setMessages(newHistory);
    
    setInputText('');
    if (!isFollowUp) {
      setAttachments([]);
    }

    setStatus(AppState.ANALYZING);
    setErrorMessage(null);

    try {
      const result = await analyzeHealthCondition(newHistory, location);
      
      const modelMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: result.text,
        groundingChunks: result.groundingChunks,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, modelMessage]);
      setStatus(AppState.RESULT);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "I'm having trouble connecting right now. Please check your connection and try again.");
      setStatus(AppState.ERROR);
    }
  };

  const readAloud = (text: string) => {
    const textToSpeak = text.replace(/[*#]/g, '');
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, status]);

  const PainScale = () => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Pain Intensity</label>
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
          painLevel === null ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' :
          painLevel <= 3 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' :
          painLevel <= 6 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' :
          painLevel <= 8 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' : 
          'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
        }`}>
          {painLevel === null ? 'Not Rated' : `${painLevel}/10`}
        </span>
      </div>
      
      <div className="relative h-12 flex items-center select-none">
         <div className="absolute inset-x-0 h-3 bg-gradient-to-r from-emerald-400 via-yellow-400 to-red-500 rounded-full opacity-20 dark:opacity-40"></div>
         <div className="relative w-full flex justify-between px-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
              <button
                key={level}
                onClick={() => setPainLevel(level === painLevel ? null : level)}
                className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  painLevel === level 
                    ? 'scale-110 shadow-lg ring-4 ring-white dark:ring-slate-900 z-10 -translate-y-1' 
                    : 'hover:scale-105 hover:-translate-y-0.5'
                } ${
                  level <= 3 ? (painLevel === level ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm') :
                  level <= 6 ? (painLevel === level ? 'bg-yellow-500 text-white' : 'bg-white dark:bg-slate-800 text-yellow-600 dark:text-yellow-400 shadow-sm') :
                  level <= 8 ? (painLevel === level ? 'bg-orange-500 text-white' : 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm') :
                  (painLevel === level ? 'bg-red-600 text-white' : 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-sm')
                }`}
              >
                {level}
              </button>
            ))}
         </div>
      </div>
      <div className="flex justify-between px-2 text-xs font-medium text-slate-400">
         <span>No Pain</span>
         <span>Moderate</span>
         <span>Severe</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500 font-sans flex flex-col selection:bg-blue-100 dark:selection:bg-blue-900/50">
      
      {/* Modern Glass Header */}
      <header className="sticky top-0 z-30 glass border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
              Triage<span className="font-light">Companion</span>
            </h1>
          </div>
          
          <div className="flex gap-2 items-center">
            <a
               href={`https://www.google.com/maps/search/hospitals+urgent+care${location ? `/@${location.lat},${location.lng},13z` : ''}`}
               target="_blank"
               rel="noopener noreferrer"
               className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-all text-xs font-bold uppercase tracking-wider border border-red-100 dark:border-red-900/50"
            >
               <MapPin className="w-3.5 h-3.5" />
               <span className="hidden sm:inline">Emergency Map</span>
            </a>

            {messages.length > 0 && (
              <button 
                onClick={reset}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Reset Session"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        
        {/* Welcome Card */}
        {messages.length === 0 && (
          <div className="animate-fade-in space-y-8">
             <div className="text-center space-y-4 py-8">
               <div className="inline-flex p-4 bg-white dark:bg-slate-900 rounded-full shadow-xl shadow-slate-200 dark:shadow-black/50 mb-2">
                 <HeartPulse className="w-12 h-12 text-blue-500 animate-pulse-slow" />
               </div>
               <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">How can I help you?</h2>
               <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                 Describe your symptoms using voice, video, or text. I'll help you understand what might be wrong.
               </p>
             </div>
          </div>
        )}

        {/* Conversation Stream */}
        {messages.length > 0 && (
          <div className="flex-1 space-y-8 pb-32">
            {messages.map((msg, idx) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-slide-up`}>
                
                {/* Message Bubble Container */}
                <div className={`w-full max-w-2xl relative group ${
                  msg.role === 'user' ? 'flex flex-col items-end' : ''
                }`}>
                  
                  {/* User Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex gap-2 mb-3 flex-wrap justify-end">
                      {msg.attachments.map(att => (
                        <div key={att.id} className="relative w-32 h-32 rounded-2xl overflow-hidden shadow-md border-2 border-white dark:border-slate-800">
                           {att.type === 'image' && <img src={att.previewUrl} className="w-full h-full object-cover" />}
                           {att.type === 'video' && <video src={att.previewUrl} className="w-full h-full object-cover bg-black" />}
                           {att.type === 'audio' && (
                             <div className="w-full h-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                               <Volume2 className="w-8 h-8 text-blue-500" />
                             </div>
                           )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bubble Content */}
                  <div className={`relative px-6 py-5 shadow-sm ${
                     msg.role === 'user' 
                       ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl rounded-tr-sm'
                       : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl rounded-tl-sm w-full shadow-lg shadow-slate-200/50 dark:shadow-none'
                  }`}>
                    
                    {/* User Pain Badge inside bubble */}
                    {msg.role === 'user' && msg.painLevel && (
                       <div className="mb-3 inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                         <Activity className="w-3 h-3" /> Pain Level: {msg.painLevel}/10
                       </div>
                    )}

                    <div className={`prose prose-base max-w-none ${
                       msg.role === 'user' ? 'prose-invert' : 'text-slate-600 dark:text-slate-300 prose-headings:text-slate-900 dark:prose-headings:text-white prose-strong:text-slate-900 dark:prose-strong:text-white prose-a:text-blue-600 dark:prose-a:text-blue-400'
                    }`}>
                      {msg.text && (
                         <ReactMarkdown components={{
                          strong: ({node, ...props}) => <span className="font-bold text-slate-900 dark:text-white" {...props} />,
                          // Style the Safety Note specifically
                          p: ({node, ...props}) => {
                            const text = String(props.children);
                            if (text.startsWith('⚠️')) {
                               return (
                                 <div className="flex gap-4 p-4 my-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl text-amber-900 dark:text-amber-200 text-sm leading-relaxed">
                                   <ShieldCheck className="w-5 h-5 flex-shrink-0 text-amber-600" />
                                   <div>{props.children}</div>
                                 </div>
                               );
                            }
                            return <p className="leading-7 mb-4 last:mb-0" {...props} />
                          },
                          ul: ({node, ...props}) => <ul className="space-y-2 my-4" {...props} />,
                          li: ({node, ...props}) => (
                            <li className="flex gap-2 items-start" {...props}>
                              <span className="mt-2 w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                              <span className="flex-1">{React.Children.toArray(props.children).filter(child => child !== '\n')}</span>
                            </li>
                          )
                         }}>
                           {msg.text}
                         </ReactMarkdown>
                      )}
                    </div>

                    {msg.role === 'model' && msg.text && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                        <button onClick={() => readAloud(msg.text!)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors uppercase tracking-wide">
                          <Volume2 className="w-3.5 h-3.5" />
                          Listen
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {status === AppState.ANALYZING && (
               <div className="flex justify-start animate-fade-in">
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl rounded-tl-sm px-6 py-4 flex items-center gap-4 shadow-md">
                    <div className="relative">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping absolute inset-0 opacity-75"></div>
                      <div className="w-3 h-3 bg-blue-500 rounded-full relative"></div>
                    </div>
                    <span className="text-slate-500 text-sm font-medium">Analyzing symptoms...</span>
                  </div>
               </div>
            )}
            
            {status === AppState.ERROR && errorMessage && (
              <div className="mx-auto max-w-md bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-xl text-center text-red-600 dark:text-red-400 text-sm">
                {errorMessage}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input & Control Area */}
        <div className={`transition-all duration-500 ease-in-out ${
          messages.length > 0 
            ? 'fixed bottom-0 left-0 right-0 p-4 z-40 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-slate-950 dark:via-slate-950 pb-6' 
            : 'bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden'
        }`}>
          <div className={`max-w-3xl mx-auto ${messages.length > 0 ? 'bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-2 pl-4 flex items-center gap-2' : 'p-6 space-y-6'}`}>
             
             {/* INTAKE FORM (When no messages) */}
             {messages.length === 0 && (
               <>
                 <section className="space-y-4">
                   <div className="flex items-center gap-2 mb-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs font-bold">1</span>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Media Input</h3>
                   </div>
                   <Recorder onCapture={handleCapture} disabled={status === AppState.ANALYZING} />
                   
                   {/* Attachments Preview Grid */}
                   {attachments.length > 0 && (
                    <div className="grid grid-cols-4 gap-3 mt-4 animate-fade-in">
                      {attachments.map(att => (
                        <div key={att.id} className="relative group rounded-xl overflow-hidden shadow-sm aspect-square border border-slate-200 dark:border-slate-700">
                          {att.type === 'image' && <img src={att.previewUrl} className="w-full h-full object-cover" />}
                          {att.type === 'video' && <video src={att.previewUrl} className="w-full h-full object-cover bg-black" />}
                          {att.type === 'audio' && (
                            <div className="w-full h-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                              <Activity className="w-6 h-6 text-blue-500" />
                            </div>
                          )}
                          <button 
                            onClick={() => removeAttachment(att.id)} 
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                 </section>

                 <section className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs font-bold">2</span>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Pain Check</h3>
                   </div>
                   <PainScale />
                 </section>
               </>
             )}

             {/* TEXT INPUT (Unified) */}
             <div className={`relative flex-1 ${messages.length === 0 ? 'space-y-4' : ''}`}>
                {messages.length === 0 && (
                   <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs font-bold">3</span>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Details</h3>
                   </div>
                )}
                
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={messages.length > 0 ? "Ask a follow-up question..." : "Describe what you're feeling..."}
                  disabled={status === AppState.ANALYZING}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && messages.length > 0) {
                      e.preventDefault();
                      handleSubmit(true);
                    }
                  }}
                  className={`w-full bg-transparent border-0 focus:ring-0 resize-none text-slate-800 dark:text-slate-100 placeholder-slate-400 ${
                    messages.length > 0 ? 'h-10 py-2' : 'h-24 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-colors'
                  }`}
                />
             </div>

             {/* Send Button (Dynamic) */}
             {messages.length > 0 ? (
               <button 
                 onClick={() => handleSubmit(true)}
                 disabled={!inputText.trim() || status === AppState.ANALYZING}
                 className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:grayscale transition-all shadow-md hover:shadow-lg"
               >
                 <Send className="w-5 h-5" />
               </button>
             ) : (
               <button
                  onClick={() => handleSubmit(false)}
                  disabled={status === AppState.ANALYZING || (attachments.length === 0 && !inputText)}
                  className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform transition-all active:scale-[0.98] ${
                    status === AppState.ANALYZING 
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                  }`}
                >
                  {status === AppState.ANALYZING ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      Analyzing...
                    </span>
                  ) : (
                    <>
                      <span>Start Triage</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
             )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default App;