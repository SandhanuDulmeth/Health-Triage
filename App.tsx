import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, HeartPulse, Trash2, RotateCcw, Activity, MapPin, X, Sun, Moon, Volume2, ExternalLink, MessageCircle, Navigation } from 'lucide-react';
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
      attachments: isFollowUp ? [] : attachments, // Only attach media to the first message/if intended
      painLevel: isFollowUp ? null : painLevel,
      timestamp: Date.now()
    };

    const newHistory = [...messages, newMessage];
    setMessages(newHistory);
    
    // Clear inputs immediately
    setInputText('');
    if (!isFollowUp) {
      setAttachments([]); // Clear attachments after sending
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
    // Simple sanitization
    const textToSpeak = text.replace(/[*#]/g, '');
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  // Scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, status]);

  const PainScale = () => (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <label className="text-lg font-medium text-slate-700 dark:text-slate-200">Pain Level</label>
        <span className={`text-xl font-bold ${
          painLevel === null ? 'text-slate-400' :
          painLevel <= 3 ? 'text-green-500' :
          painLevel <= 6 ? 'text-yellow-500' :
          painLevel <= 8 ? 'text-orange-500' : 'text-red-600'
        }`}>
          {painLevel === null ? 'None selected' : painLevel + '/10'}
        </span>
      </div>
      <div className="flex gap-1 h-12">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
          <button
            key={level}
            onClick={() => setPainLevel(level === painLevel ? null : level)}
            className={`flex-1 rounded-md transition-all duration-200 font-semibold text-sm sm:text-base border-y-4 border-transparent ${
               painLevel === level 
                 ? 'transform -translate-y-2 shadow-lg scale-110 z-10' 
                 : 'hover:-translate-y-1 hover:opacity-80'
            } ${
              level <= 3 ? (painLevel === level ? 'bg-green-500 text-white border-b-green-700' : 'bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-200') :
              level <= 6 ? (painLevel === level ? 'bg-yellow-400 text-black border-b-yellow-600' : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200') :
              level <= 8 ? (painLevel === level ? 'bg-orange-500 text-white border-b-orange-700' : 'bg-orange-200 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200') :
              (painLevel === level ? 'bg-red-600 text-white border-b-red-800' : 'bg-red-200 dark:bg-red-900/40 text-red-800 dark:text-red-200')
            }`}
          >
            {level}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
        <span>No Pain</span>
        <span>Mild</span>
        <span>Moderate</span>
        <span>Severe</span>
        <span>Worst</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-sky-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-20 transition-colors duration-300">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
              <HeartPulse className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Health Triage</h1>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {/* Find Hospital Button */}
            <a
               href={`https://www.google.com/maps/search/hospitals+urgent+care${location ? `/@${location.lat},${location.lng},13z` : ''}`}
               target="_blank"
               rel="noopener noreferrer"
               className="mr-1 flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full sm:rounded-lg transition shadow-sm border border-red-700"
               title="Find Nearest Hospitals"
            >
               <MapPin className="w-4 h-4" />
               <span className="hidden sm:inline text-sm font-bold">Find Hospitals</span>
            </a>

            {messages.length > 0 && (
              <button 
                onClick={reset}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                title="Start Over"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 flex flex-col gap-6">
        
        {/* Intro - Only show if no conversation history */}
        {messages.length === 0 && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center space-y-4 animate-in fade-in duration-500">
             <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
               <Activity className="w-8 h-8" />
             </div>
             <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">How are you feeling today?</h2>
             <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
               I can help check your symptoms. Show me what's wrong, tell me how it hurts, and I'll help you decide what to do next.
             </p>
          </div>
        )}

        {/* Chat History View */}
        {messages.length > 0 && (
          <div className="flex-1 space-y-8 pb-32">
            {messages.map((msg, idx) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                
                {/* Message Bubble */}
                <div className={`w-full ${
                  msg.role === 'user' 
                    ? 'max-w-[95%] sm:max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-br-none shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-none shadow-md overflow-hidden'
                }`}>
                  
                  {/* Attachments (User only usually) */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 p-1 bg-black/10">
                      {msg.attachments.map(att => (
                        <div key={att.id} className="relative aspect-square">
                           {att.type === 'image' && <img src={att.previewUrl} className="w-full h-full object-cover rounded-lg" />}
                           {att.type === 'video' && <video src={att.previewUrl} className="w-full h-full object-cover rounded-lg bg-black" />}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Message Content */}
                  <div className={`p-5 prose prose-lg max-w-none ${
                     msg.role === 'user' ? 'prose-invert' : 'text-slate-700 dark:text-slate-300 prose-headings:text-slate-900 dark:prose-headings:text-white prose-strong:text-slate-900 dark:prose-strong:text-white prose-a:text-blue-600 dark:prose-a:text-blue-400'
                  }`}>
                    {/* Pain Level Badge for User */}
                    {msg.role === 'user' && msg.painLevel && (
                       <div className="inline-block bg-white/20 px-2 py-0.5 rounded text-sm font-medium mb-2">
                         Pain Level: {msg.painLevel}/10
                       </div>
                    )}

                    {msg.text && (
                       <ReactMarkdown components={{
                        strong: ({node, ...props}) => {
                          const isSafety = String(props.children).includes('Safety Note');
                          if (isSafety) return <span className="text-red-600 dark:text-red-400 font-extrabold text-xl block mb-2">{props.children}</span>
                          return <strong className="font-semibold" {...props} />
                        },
                        p: ({node, ...props}) => {
                          const text = String(props.children);
                          if (text.startsWith('⚠️') && msg.role === 'model') {
                             return <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg mb-6 text-red-900 dark:text-red-200 font-medium">{props.children}</div>
                          }
                          return <p className="mb-4 last:mb-0 leading-relaxed" {...props} />
                        }
                       }}>
                         {msg.text}
                       </ReactMarkdown>
                    )}
                  </div>

                  {/* Footer actions (Read Aloud) */}
                  {msg.role === 'model' && msg.text && (
                    <div className="flex justify-end p-2 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl">
                      <button onClick={() => readAloud(msg.text!)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 transition text-sm font-medium">
                        <Volume2 className="w-4 h-4" />
                        <span>Read Aloud</span>
                      </button>
                    </div>
                  )}

                </div>
              </div>
            ))}
            
            {status === AppState.ANALYZING && (
               <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-bl-none p-4 flex items-center gap-3 shadow-sm">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Checking symptoms...</span>
                  </div>
               </div>
            )}
            
            {status === AppState.ERROR && errorMessage && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-4 rounded-xl text-center border border-red-200 dark:border-red-900">
                {errorMessage}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Area (Sticky Bottom for Chat, or Static for First Load) */}
        <div className={`bg-white dark:bg-slate-900 transition-all duration-300 ${
          messages.length > 0 
            ? 'fixed bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-800 shadow-lg z-30' 
            : 'rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 p-4'
        }`}>
          <div className={`max-w-2xl mx-auto space-y-4 ${messages.length > 0 ? 'flex items-end gap-3 space-y-0' : ''}`}>
             
             {/* Main Intake Form (Hidden if chat started) */}
             {messages.length === 0 && (
               <>
                 <div className="space-y-2">
                   <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">1. Show or Tell Me</h3>
                   <Recorder onCapture={handleCapture} disabled={status === AppState.ANALYZING} />
                   {/* Attachment Preview */}
                   {attachments.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {attachments.map(att => (
                        <div key={att.id} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm aspect-square">
                          {att.type === 'image' && <img src={att.previewUrl} className="w-full h-full object-cover" />}
                          {att.type === 'video' && <video src={att.previewUrl} className="w-full h-full object-cover bg-black" />}
                          {att.type === 'audio' && (
                            <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <Activity className="w-6 h-6 text-blue-500" />
                            </div>
                          )}
                          <button onClick={() => removeAttachment(att.id)} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                 </div>

                 <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                   <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">2. Pain Level (Optional)</h3>
                   <PainScale />
                 </div>
                 
                 <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                   <div className="flex justify-between">
                    <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">3. Details</h3>
                    {inputText && <button onClick={() => setInputText('')} className="text-xs text-slate-400 flex items-center gap-1"><X className="w-3 h-3"/> Clear</button>}
                   </div>
                 </div>
               </>
             )}

             {/* Text Input (Adapts for Chat vs Intake) */}
             <div className="flex-1 relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={messages.length > 0 ? "Ask a follow-up question (optional)..." : "Describe symptoms..."}
                  disabled={status === AppState.ANALYZING}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && messages.length > 0) {
                      e.preventDefault();
                      handleSubmit(true);
                    }
                  }}
                  className={`w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus:border-blue-400 focus:ring-0 resize-none text-slate-800 dark:text-slate-100 placeholder-slate-400 ${
                    messages.length > 0 ? 'h-14 py-3 pl-4 pr-12 rounded-full border shadow-sm' : 'h-32 p-4 border-2'
                  }`}
                />
                {messages.length > 0 && (
                   <button 
                     onClick={() => handleSubmit(true)}
                     disabled={!inputText.trim() || status === AppState.ANALYZING}
                     className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 transition shadow-md"
                   >
                     <Send className="w-5 h-5" />
                   </button>
                )}
             </div>

             {/* Big Submit Button (Only for Intake) */}
             {messages.length === 0 && (
               <button
                  onClick={() => handleSubmit(false)}
                  disabled={status === AppState.ANALYZING || (attachments.length === 0 && !inputText)}
                  className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg transform transition active:scale-95 ${
                    status === AppState.ANALYZING 
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-wait'
                      : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600'
                  }`}
                >
                  {status === AppState.ANALYZING ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Thinking...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Check Symptoms</span>
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