"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown"; 
import { 
   askQuestion, 
   uploadPDF, 
   uploadURL, 
   uploadVideo, 
   getSources, 
   deleteSource 
} from "../services/api"; 

import SourceModal from "../components/SourceModal"; 
import { UserButton } from "@clerk/nextjs"; 

type Message = {
  role: "user" | "ai";
  text: string;
  sources?: string[];
};

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [isAdmin, setIsAdmin] = useState(false); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  
  const [selectedPDF, setSelectedPDF] = useState<string | null>(null);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [currentUser] = useState("Rishu_Admin");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const [webUrl, setWebUrl] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null); 

  useEffect(() => {
    setIsSidebarOpen(isAdmin);
  }, [isAdmin]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  useEffect(() => {
    const savedChat = localStorage.getItem("anatya_chat_history");
    if (savedChat) setMessages(JSON.parse(savedChat));
    fetchSources();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("anatya_chat_history", JSON.stringify(messages));
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSources = async () => {
    try {
      const data = await getSources(currentUser);
      const fetchedSources = data.sources || [];
      setSources(fetchedSources);
      setSelectedSources(fetchedSources);
    } catch (err) {
      console.error("Failed to fetch sources", err);
    }
  };

  const clearHistory = () => {
    if (confirm("Clear all chat history?")) {
      setMessages([]);
      setSuggestions([]);
      localStorage.removeItem("anatya_chat_history");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setLoading(true);
    try {
      await uploadPDF(e.target.files[0], currentUser);
      await fetchSources();
    } catch { 
      alert("Upload failed ❌"); 
    } finally {
      setLoading(false);
    }
  };

  const handleWebUpload = async () => {
    if (!webUrl.trim()) return;
    setLoading(true);
    try {
      await uploadURL(webUrl, currentUser);
      setWebUrl("");
      await fetchSources();
    } catch { alert("Failed ❌"); } finally { setLoading(false); }
  };

  const handleVideoUpload = async () => {
    if (!youtubeUrl.trim()) return;
    setLoading(true);
    try {
      await uploadVideo(youtubeUrl, currentUser);
      setYoutubeUrl("");
      await fetchSources();
    } catch { alert("Failed ❌"); } finally { setLoading(false); }
  };

  const handleDeleteSource = async (name: string) => {
    if (confirm(`Delete ${name} from library?`)) {
      try {
        await deleteSource(name, currentUser);
        await fetchSources();
        setActiveMenu(null);
      } catch { alert("Delete failed ❌"); }
    }
  };

  const renderCitations = (text: string, msgSources?: string[]) => {
    const parts = text.split(/(\[\d+\])/g);
    const externalLinks = msgSources?.filter(s => s.startsWith('http')) || [];

    const mainContent = parts.map((part, index) => {
      const match = part.match(/\[(\d+)\]/);
      if (match) {
        const sourceIdx = parseInt(match[1]) - 1;
        const sourceName = msgSources?.[sourceIdx];
        return (
          <span
            key={`citation-${index}`}
            onClick={() => sourceName && !sourceName.startsWith('http') && setSelectedPDF(sourceName)}
            className="citation-bubble cursor-pointer text-blue-400 hover:underline px-1"
            title={sourceName || "Source"}
          >
            {match[1]}
          </span>
        );
      }
      return (
        <span key={`text-${index}`} className="prose prose-invert max-w-none inline leading-relaxed">
          <ReactMarkdown>{part}</ReactMarkdown>
        </span>
      );
    });

    return (
      <>
        {mainContent}
        {externalLinks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#3c4043] flex flex-wrap gap-3 items-center">
            <p className="text-[10px] font-bold text-[#9aa0a6] uppercase tracking-widest mr-1">View Source:</p>
            {externalLinks.map((link, idx) => (
              <a 
                key={idx} 
                href={link} 
                target="_blank" 
                rel="noopener noreferrer"
                title={link}
                className="w-8 h-8 flex items-center justify-center bg-[#282a2c] hover:bg-[#3c4043] border border-[#444746] rounded-lg transition-all active:scale-90"
              >
                <span className="text-sm">🔗</span>
              </a>
            ))}
          </div>
        )}
      </>
    );
  };

  const handleAsk = async (explicitQuery?: string) => {
    const finalQuery = explicitQuery || query;
    if (!finalQuery.trim()) return;

    setQuery("");
    setSuggestions([]); 
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: finalQuery }]);
    let currentAiMessage = "";
    setMessages((prev) => [...prev, { role: "ai", text: "" }]);

    try {
      const response = await fetch(`http://localhost:8000/ask-stream?query=${finalQuery}&user_id=${currentUser}`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_sources: selectedSources })
      });
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          
          if (chunk.startsWith('{"sources"')) {
             const meta = JSON.parse(chunk.split('\n')[0]);
             setMessages(prev => {
               const updated = [...prev];
               updated[updated.length - 1].sources = meta.sources;
               return updated;
             });
             continue;
          }

          currentAiMessage += chunk;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1].text = currentAiMessage;
            return updated;
          });
        }
      }

      const finalRes = await askQuestion(finalQuery, currentUser);
      if (finalRes.suggestions) setSuggestions(finalRes.suggestions);

    } catch (err) {
      setMessages((prev) => [...prev, { role: "ai", text: "Error fetching response ❌" }]);
    } finally { setLoading(false); }
  };

  return (
    <main className="flex h-screen w-full bg-[#131314] text-[#e3e3e3] overflow-hidden font-sans">
      
      {/* SIDEBAR TOGGLE */}
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute top-4 left-4 z-50 p-2 bg-[#1e1f20] border border-[#3c4043] rounded-lg hover:bg-[#282a2c] transition-all"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
        </svg>
      </button>

      {/* ASIDE: SOURCES */}
      <aside className={`bg-[#1e1f20] border-r border-[#3c4043] flex flex-col shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? "w-[300px]" : "w-0 opacity-0 invisible border-none"}`}>
        <div className="p-6 pt-16 border-b border-[#3c4043] flex justify-between items-center whitespace-nowrap">
          <h1 className="text-xl font-medium tracking-tight">Sources</h1>
          <button 
            onClick={() => setIsAdmin(!isAdmin)}
            className={`text-[9px] px-2 py-1 rounded border font-bold uppercase transition-all ${isAdmin ? 'bg-[#a8c7fa] text-black border-[#a8c7fa]' : 'bg-[#282a2c] text-[#9aa0a6] border-[#444746]'}`}
          >
            {isAdmin ? "Admin Mode" : "User Mode"}
          </button>
        </div>

        {isAdmin && (
          <>
            <div className="p-4 whitespace-nowrap">
              <button 
                onClick={() => setIsModalOpen(true)}
                className="w-full bg-[#282a2c] hover:bg-[#3c4043] py-2.5 rounded-full border border-[#444746] text-sm font-medium transition-all flex items-center justify-center gap-2"
              >
                <span className="text-lg">+</span> Add sources
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar whitespace-nowrap">
              <div className="mb-4 px-2">
                <p className="text-[11px] text-[#9aa0a6] font-bold uppercase tracking-wider">Indexed Content</p>
              </div>

              <div className="space-y-1">
                {sources.map((src, i) => (
                  <div key={i} className="relative group">
                    <div className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-default hover:bg-[#282a2c]">
                      <span className="text-xs opacity-70">
                        {src.includes('youtube.com') || src.includes('youtu.be') ? '🎥' : src.startsWith('http') ? '🌐' : '📄'}
                      </span>
                      <span className="text-[13px] truncate flex-1 text-[#e3e3e3]">{src}</span>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === src ? null : src); }}
                        className="opacity-0 group-hover:opacity-100 text-[#9aa0a6] hover:text-white p-1"
                      >
                        ⋮
                      </button>
                    </div>
                    {activeMenu === src && (
                      <div ref={menuRef} className="absolute right-2 top-10 source-menu w-44 z-50 animate-in fade-in zoom-in-95 duration-100 shadow-2xl bg-[#1e1f20] border border-[#3c4043] rounded-xl overflow-hidden p-1.5">
                        <button className="flex items-center gap-3 w-full text-left p-2 rounded-lg hover:bg-[#3c4043] transition-colors" onClick={() => { alert("Rename coming soon"); setActiveMenu(null); }}>
                            <span className="text-sm">✏️</span> <span className="text-[13px]">Rename</span> 
                        </button>
                        <button className="flex items-center gap-3 w-full text-left p-2 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors" onClick={() => handleDeleteSource(src)}>
                            <span className="text-sm">🗑️</span> <span className="text-[13px]">Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </aside>

      {/* MAIN CHAT */}
      <section className="flex-1 flex flex-col relative min-w-0 bg-[#131314]">
        <header className="h-16 border-b border-[#3c4043] flex items-center px-6 justify-between bg-[#131314]/90 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-4 pl-12">
             <span className="text-sm font-bold tracking-tight">Anantya Research Hub</span>
             <span className="w-1 h-1 bg-[#3c4043] rounded-full"></span>
             <span className="text-[10px] text-[#5f6368] uppercase tracking-widest">{sources.length} sources</span>
          </div>
          
          {/* RESET CHAT MOVED TO RIGHT CORNER */}
          <div className="flex items-center gap-6">
             <button 
                onClick={clearHistory}
                className="text-[10px] text-[#9aa0a6] hover:text-rose-400 uppercase tracking-widest font-bold transition-colors"
             >
                Reset Chat
             </button>
             <UserButton fallbackRedirectUrl="/" />
          </div>
        </header>

        <div className={`flex-1 overflow-y-auto custom-scrollbar transition-all ${selectedPDF ? 'px-6' : 'px-4 md:px-12'}`}>
          <div className={`max-w-4xl mx-auto w-full p-8 space-y-12 pb-48`}>
            {messages.length === 0 && !loading && (
              <div className="h-full flex flex-col items-center justify-center pt-24 opacity-10 select-none grayscale">
                <span className="text-9xl mb-6">📖</span>
                <h2 className="text-3xl font-light tracking-tighter">Your knowledge starts here</h2>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className="flex flex-col mb-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`${
                    m.role === "user" 
                    ? "bg-[#282a2c] text-[#e3e3e3] border border-[#3c4043] px-6 py-4 rounded-[2rem] max-w-[80%] shadow-lg shadow-black/20" 
                    : "w-full text-[#e3e3e3] leading-relaxed text-[16px] font-normal"
                  }`}>
                    <div className="prose prose-invert prose-p:leading-7 prose-li:my-1 max-w-none text-[15px]">
                      {m.role === "ai" ? renderCitations(m.text, m.sources) : <ReactMarkdown>{m.text}</ReactMarkdown>}
                    </div>

                    {m.role === "ai" && i === messages.length - 1 && suggestions.length > 0 && !loading && (
                      <div className="flex flex-col items-start gap-2 mt-8 w-full max-w-2xl">
                        {suggestions.map((s, index) => {
                          const cleanSuggestion = s.replace(/^[\*\-\s]+/, "");
                          return (
                          <button 
                            key={index} 
                            onClick={() => handleAsk(cleanSuggestion)} 
                            className="suggestion-pill w-fit text-left px-5 py-2.5 rounded-2xl text-[12.5px] font-medium transition-all hover:bg-[#3c4043] border border-[#3c4043] active:scale-95"
                          >
                            ✦ {cleanSuggestion}
                          </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {loading && messages[messages.length-1]?.text === "" && (
              <div className="flex items-center gap-3 text-[#a8c7fa] text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                <span className="w-1.5 h-1.5 bg-[#a8c7fa] rounded-full"></span> Researching sources...
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* INPUT AREA */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-input-gradient pointer-events-none z-30">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <div className="flex items-center bg-[#1e1f20] border border-[#444746] rounded-[2.5rem] p-2 focus-within:ring-1 focus-within:ring-[#a8c7fa]/40 focus-within:border-[#a8c7fa] transition-all shadow-2xl shadow-black/80">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                placeholder="Ask a question about your sources..."
                className="flex-1 bg-transparent px-6 py-4 outline-none text-[15px] text-[#e3e3e3] placeholder-[#9aa0a6] font-normal"
              />
              <button 
                onClick={() => handleAsk()} 
                disabled={loading || !query.trim()}
                className="bg-[#a8c7fa] w-12 h-12 rounded-full flex items-center justify-center hover:bg-[#d2e3fc] transition-all disabled:opacity-20 disabled:grayscale active:scale-90 shadow-lg"
              >
                <span className="text-black text-xl font-bold">➔</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PDF VIEWER */}
      {selectedPDF && (
        <aside className="w-[50%] bg-[#f8fafc] border-l border-[#3c4043] relative animate-in slide-in-from-right duration-500 shadow-2xl z-40">
           <div className="absolute top-4 left-4 right-4 flex justify-between items-center bg-white/90 backdrop-blur-md p-3 rounded-2xl z-50 border border-slate-200 shadow-xl">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 font-bold">📄</div>
                <span className="text-xs font-bold text-slate-800 truncate w-64 uppercase tracking-tighter">{selectedPDF}</span>
             </div>
             <button 
              onClick={() => setSelectedPDF(null)} 
              className="bg-slate-900 hover:bg-rose-600 text-white text-[10px] px-5 py-2 rounded-xl font-bold transition-all shadow-lg active:scale-95"
             >
                CLOSE
             </button>
           </div>
           <div className="h-full w-full bg-slate-100">
              <iframe src={`http://localhost:8000/data/${selectedPDF}#toolbar=0`} className="w-full h-full pt-24" title="PDF Viewer" />
           </div>
        </aside>
      )}

      <SourceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onFileUpload={handleUpload}
        onUrlUpload={handleWebUpload}
        onVideoUpload={handleVideoUpload}
        webUrl={webUrl} setWebUrl={setWebUrl}
        youtubeUrl={youtubeUrl} setYoutubeUrl={setYoutubeUrl}
        loading={loading}
      />
    </main>
  );
}
