import React, { useState, useEffect } from 'react';
import { 
  Library, 
  Plus, 
  Search, 
  BookOpen, 
  FileText, 
  Settings, 
  MessageSquare,
  ChevronRight,
  Loader2,
  Trash2,
  ExternalLink,
  PenTool,
  BarChart,
  CheckCircle,
  Menu,
  X,
  Sparkles,
  History,
  Sun,
  Moon,
  UploadCloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Project, Note, Citation, AgentMode } from './types';
import { AGENT_CONFIGS } from './constants';
import { GoogleGenAI, Type } from "@google/genai";
import Markdown from 'react-markdown';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const Sidebar = ({ 
  projects, 
  activeProject, 
  onSelectProject, 
  onNewProject,
  onDeleteProject
}: { 
  projects: Project[]; 
  activeProject: Project | null; 
  onSelectProject: (p: Project) => void;
  onNewProject: () => void;
  onDeleteProject: (e: React.MouseEvent, id: number) => void;
}) => {
  return (
    <div className="w-64 border-r border-line h-screen flex flex-col bg-white shadow-xl z-10">
      <div className="p-6 border-b border-line flex items-center gap-2 bg-accent/5">
        <div className="w-8 h-8 bg-accent rounded flex items-center justify-center text-white font-serif font-bold shadow-lg shadow-accent/20">S</div>
        <h1 className="font-serif font-bold text-lg tracking-tight text-accent">ScholarSync</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink/50">Projects</h2>
          <button 
            onClick={onNewProject}
            className="p-1 hover:bg-line rounded transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>
        
        <div className="space-y-1">
          {projects.map(project => (
            <div key={project.id} className="group relative">
              <button
                onClick={() => onSelectProject(project)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-all flex items-center gap-2 pr-8",
                  activeProject?.id === project.id 
                    ? "bg-accent text-white font-medium" 
                    : "hover:bg-line text-ink/70"
                )}
              >
                <BookOpen size={16} className={activeProject?.id === project.id ? "text-white" : "text-ink/40"} />
                <span className="truncate">{project.title}</span>
              </button>
              <button 
                onClick={(e) => onDeleteProject(e, project.id)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink/0 group-hover:text-ink/40 hover:text-red-500 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="p-4 border-t border-line">
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink/60 hover:text-ink transition-colors">
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
};

const FloatingAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<{id: number, query: string, created_at: string}[]>([]);

  const fetchSearchHistory = async () => {
    try {
      const res = await fetch('/api/search-history');
      const data = await res.json();
      setSearchHistory(data);
    } catch (err) {
      console.error("Failed to fetch search history:", err);
    }
  };

  useEffect(() => {
    if (isOpen && showHistory) {
      fetchSearchHistory();
    }
  }, [isOpen, showHistory]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      // Save to search history
      fetch('/api/search-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg })
      }).catch(err => console.error("Failed to save search history:", err));

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: userMsg }] }
        ],
        config: {
          systemInstruction: "You are a helpful AI research assistant for the ScholarSync platform. You provide quick answers and help users navigate the platform. Be concise, polite, and scholarly in your tone."
        }
      });
      const response = await model;
      setMessages(prev => [...prev, { role: 'assistant', content: response.text || "I'm sorry, I couldn't process that." }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Error connecting to the scholarly network. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 right-0 w-80 h-96 bg-white border border-line rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-4 bg-accent text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-gold" />
                <span className="font-serif font-bold tracking-tight">Scholar Assistant</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowHistory(!showHistory)} 
                  className={cn("p-1.5 rounded-lg transition-colors", showHistory ? "bg-white/20" : "hover:bg-white/10")}
                  title="Search History"
                >
                  <History size={16} />
                </button>
                <button onClick={() => setIsOpen(false)} className="hover:rotate-90 transition-transform"><X size={18} /></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg/30">
              {showHistory ? (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-ink/40 mb-2">Recent Queries</h4>
                  {searchHistory.length === 0 ? (
                    <p className="text-xs text-ink/30 italic text-center py-8">No search history yet.</p>
                  ) : (
                    searchHistory.map((item) => (
                      <button 
                        key={item.id}
                        onClick={() => {
                          setInput(item.query);
                          setShowHistory(false);
                        }}
                        className="w-full text-left p-2.5 bg-white border border-line rounded-xl text-xs hover:border-accent/30 hover:bg-accent/5 transition-all group flex items-center gap-2"
                      >
                        <Search size={12} className="text-ink/20 group-hover:text-accent/40" />
                        <span className="truncate flex-1">{item.query}</span>
                        <span className="text-[8px] text-ink/20">{new Date(item.created_at).toLocaleDateString()}</span>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                <>
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-3">
                        <Sparkles size={24} className="text-accent" />
                      </div>
                      <p className="text-xs text-ink/60 italic font-serif">"Knowledge is the light that guides the way."</p>
                      <p className="text-[10px] text-ink/40 mt-2">How can I assist your research today?</p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[85%] p-3 rounded-2xl text-xs shadow-sm",
                        m.role === 'user' ? "bg-accent text-white rounded-tr-none" : "bg-white border border-line rounded-tl-none"
                      )}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-line p-2 rounded-xl rounded-tl-none shadow-sm">
                        <Loader2 size={12} className="animate-spin text-accent" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {!showHistory && (
              <form onSubmit={handleSend} className="p-3 border-t border-line bg-white">
                <div className="relative">
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me anything..."
                    className="w-full pl-3 pr-10 py-2 bg-bg border border-line rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-accent hover:bg-accent/10 rounded-lg transition-all disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95",
          isOpen ? "bg-white text-accent border border-line" : "bg-accent text-white"
        )}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-warm rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>
    </div>
  );
};

const LiteratureReviewTool = ({ activeProject, onRefresh }: { activeProject: Project, onRefresh: () => void }) => {
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ summary: string, citations: any[] } | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Conduct a comprehensive literature review on the topic: "${topic}". 
        Provide a detailed summary of key findings and list at least 5 relevant academic citations with titles, authors, years, and URLs if available.
        Format the response as JSON with 'summary' and 'citations' fields.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              citations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    authors: { type: Type.STRING },
                    year: { type: Type.STRING },
                    url: { type: Type.STRING },
                    abstract: { type: Type.STRING }
                  },
                  required: ["title", "authors", "year"]
                }
              }
            },
            required: ["summary", "citations"]
          }
        }
      });
      
      const data = JSON.parse(response.text);
      setResults(data);
    } catch (error) {
      console.error(error);
      alert("Failed to generate literature review.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveAll = async () => {
    if (!results) return;
    
    // Save summary as a note
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: activeProject.id,
        title: `Lit Review: ${topic}`,
        content: results.summary,
        type: 'summary'
      })
    });

    // Save citations
    for (const citation of results.citations) {
      await fetch('/api/citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...citation,
          project_id: activeProject.id
        })
      });
    }

    onRefresh();
    alert("Literature review and citations saved to project!");
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-bg/30">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-line p-8 mb-8">
          <h2 className="font-serif font-bold text-2xl text-accent mb-2">Literature Review Tool</h2>
          <p className="text-ink/60 text-sm mb-6 font-serif italic">"Seek knowledge from the cradle to the grave."</p>
          
          <div className="flex gap-4">
            <input 
              type="text" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter research topic (e.g., Impact of AI on Rural Education in Bangladesh)"
              className="flex-1 px-4 py-3 bg-bg border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
            <button 
              onClick={handleGenerate}
              disabled={isLoading || !topic.trim()}
              className="px-6 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent/90 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              <span>Generate Review</span>
            </button>
          </div>
        </div>

        {results && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-line p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-serif font-bold text-xl text-accent">Synthesis & Summary</h3>
                <button 
                  onClick={saveAll}
                  className="px-4 py-2 bg-accent-warm text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-accent-warm/90 transition-all shadow-lg shadow-accent-warm/20"
                >
                  Save to Project
                </button>
              </div>
              <div className="markdown-body">
                <Markdown>{results.summary}</Markdown>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-line p-8">
              <h3 className="font-serif font-bold text-xl text-accent mb-6">Relevant Citations</h3>
              <div className="space-y-4">
                {results.citations.map((c, i) => (
                  <div key={i} className="p-4 bg-bg/50 rounded-xl border border-line/50 hover:border-accent/30 transition-all group">
                    <h4 className="font-bold text-ink group-hover:text-accent transition-colors">{c.title}</h4>
                    <p className="text-sm text-ink/60 mb-2">{c.authors} • {c.year}</p>
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1">
                        <ExternalLink size={12} />
                        <span>View Source</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const CitationManager = ({ activeProject, citations, onRefresh }: { activeProject: Project, citations: Citation[], onRefresh: () => void }) => {
  const [style, setStyle] = useState<'APA' | 'MLA' | 'Chicago'>('APA');
  const [isAdding, setIsAdding] = useState(false);
  const [newCitation, setNewCitation] = useState({ title: '', authors: '', year: '', url: '', doi: '' });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/citations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newCitation, project_id: activeProject.id })
    });
    setNewCitation({ title: '', authors: '', year: '', url: '', doi: '' });
    setIsAdding(false);
    onRefresh();
  };

  const format = (c: Citation) => {
    switch (style) {
      case 'APA':
        return `${c.authors} (${c.year}). ${c.title}. ${c.url ? `Retrieved from ${c.url}` : ''}`;
      case 'MLA':
        return `${c.authors}. "${c.title}." ${c.year}. ${c.url ? `Web. <${c.url}>` : ''}`;
      case 'Chicago':
        return `${c.authors}. "${c.title}." ${c.year}. ${c.url ? c.url : ''}`;
      default:
        return `${c.authors} (${c.year}). ${c.title}.`;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Citation copied to clipboard!");
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-bg/30">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-serif font-bold text-2xl text-accent">Citation Manager</h2>
            <p className="text-ink/60 text-sm font-serif italic">"Preserve the lineage of knowledge."</p>
          </div>
          <div className="flex items-center gap-4">
            <select 
              value={style} 
              onChange={(e) => setStyle(e.target.value as any)}
              className="bg-white border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="APA">APA Style</option>
              <option value="MLA">MLA Style</option>
              <option value="Chicago">Chicago Style</option>
            </select>
            <button 
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent/90 transition-all flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Add Citation</span>
            </button>
          </div>
        </div>

        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl border border-line p-8 mb-8"
          >
            <h3 className="font-serif font-bold text-lg mb-4">Add New Citation</h3>
            <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[10px] uppercase tracking-widest text-ink/40 mb-1">Title</label>
                <input 
                  required
                  value={newCitation.title}
                  onChange={e => setNewCitation({...newCitation, title: e.target.value})}
                  className="w-full px-3 py-2 bg-bg border border-line rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-ink/40 mb-1">Authors</label>
                <input 
                  required
                  value={newCitation.authors}
                  onChange={e => setNewCitation({...newCitation, authors: e.target.value})}
                  className="w-full px-3 py-2 bg-bg border border-line rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-ink/40 mb-1">Year</label>
                <input 
                  required
                  value={newCitation.year}
                  onChange={e => setNewCitation({...newCitation, year: e.target.value})}
                  className="w-full px-3 py-2 bg-bg border border-line rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-ink/40 mb-1">URL</label>
                <input 
                  value={newCitation.url}
                  onChange={e => setNewCitation({...newCitation, url: e.target.value})}
                  className="w-full px-3 py-2 bg-bg border border-line rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-ink/40 mb-1">DOI</label>
                <input 
                  value={newCitation.doi}
                  onChange={e => setNewCitation({...newCitation, doi: e.target.value})}
                  className="w-full px-3 py-2 bg-bg border border-line rounded-lg text-sm"
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm text-ink/60 hover:text-ink">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-accent text-white rounded-lg text-sm font-bold">Save Citation</button>
              </div>
            </form>
          </motion.div>
        )}

        <div className="space-y-4">
          {citations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-line p-12 text-center opacity-40">
              <Library size={48} className="mx-auto mb-4" />
              <p className="font-serif">No citations found in this project.</p>
            </div>
          ) : (
            citations.map(c => (
              <div key={c.id} className="bg-white rounded-xl border border-line p-6 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-ink mb-1">{c.title}</h4>
                    <p className="text-sm text-ink/60 mb-4">{c.authors} • {c.year}</p>
                    <div className="p-3 bg-bg rounded-lg border border-line/50 text-xs font-mono text-ink/80 relative group/cite">
                      {format(c)}
                      <button 
                        onClick={() => copyToClipboard(format(c))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white border border-line rounded opacity-0 group-hover/cite:opacity-100 transition-opacity shadow-sm"
                        title="Copy formatted citation"
                      >
                        <FileText size={12} className="text-accent" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-bg rounded-lg text-ink/40 hover:text-accent transition-all">
                        <ExternalLink size={16} />
                      </a>
                    )}
                    <button 
                      onClick={async () => {
                        if(confirm("Delete this citation?")) {
                          await fetch(`/api/citations/${c.id}`, { method: 'DELETE' });
                          onRefresh();
                        }
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg text-ink/0 group-hover:text-ink/20 hover:text-red-500 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const PDFAnalysisTool = ({ activeProject, onRefresh }: { activeProject: Project, onRefresh: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<{ summary: string, methodology: string, findings: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        
        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: [
            {
              inlineData: {
                data: base64Data,
                mimeType: "application/pdf"
              }
            },
            {
              text: "Analyze this research paper. Extract the following information: 1. A concise summary. 2. The research methodology used. 3. Key findings and conclusions. Format the response as JSON with fields 'summary', 'methodology', and 'findings'."
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                methodology: { type: Type.STRING },
                findings: { type: Type.STRING }
              },
              required: ["summary", "methodology", "findings"]
            }
          }
        });

        const result = JSON.parse(response.text || '{}');
        setAnalysis(result);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      alert("Failed to analyze PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveToProject = async () => {
    if (!analysis) return;
    
    const content = `
## PDF Analysis: ${file?.name}

### Summary
${analysis.summary}

### Methodology
${analysis.methodology}

### Key Findings
${analysis.findings}
    `;

    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: activeProject.id,
        title: `PDF Summary: ${file?.name}`,
        content: content,
        type: 'summary'
      })
    });

    onRefresh();
    alert("Analysis saved to project notes!");
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-bg/30">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-ink rounded-2xl shadow-xl border border-line p-8 mb-8">
          <h2 className="font-serif font-bold text-2xl text-accent mb-2">PDF Research Analyzer</h2>
          <p className="text-ink/60 dark:text-ink/40 text-sm mb-6 font-serif italic">"Read in the name of your Lord who created."</p>
          
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-line rounded-2xl p-12 bg-bg/5 hover:bg-bg/10 transition-all cursor-pointer relative group">
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <UploadCloud size={48} className="text-accent mb-4 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-medium text-ink/80">{file ? file.name : "Click or drag to upload a research paper (PDF)"}</p>
            <p className="text-[10px] text-ink/40 mt-2 uppercase tracking-widest">Max size: 10MB</p>
          </div>

          {file && !analysis && (
            <div className="mt-6 flex justify-center">
              <button 
                onClick={handleAnalyze}
                disabled={isLoading}
                className="px-8 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent/90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-accent/20"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                <span>Analyze Paper</span>
              </button>
            </div>
          )}
        </div>

        {analysis && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-ink rounded-2xl shadow-xl border border-line p-8">
              <div className="flex justify-between items-center mb-6 border-b border-line pb-4">
                <h3 className="font-serif font-bold text-xl text-accent">Analysis Results</h3>
                <button 
                  onClick={saveToProject}
                  className="px-4 py-2 bg-accent-warm text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-accent-warm/90 transition-all shadow-lg shadow-accent-warm/20 flex items-center gap-2"
                >
                  <CheckCircle size={14} />
                  <span>Save to Project</span>
                </button>
              </div>
              
              <div className="space-y-6">
                <section>
                  <h4 className="text-[10px] uppercase tracking-widest text-accent font-bold mb-2">Summary</h4>
                  <p className="text-sm leading-relaxed text-ink/80">{analysis.summary}</p>
                </section>
                <section>
                  <h4 className="text-[10px] uppercase tracking-widest text-accent font-bold mb-2">Methodology</h4>
                  <p className="text-sm leading-relaxed text-ink/80">{analysis.methodology}</p>
                </section>
                <section>
                  <h4 className="text-[10px] uppercase tracking-widest text-accent font-bold mb-2">Key Findings</h4>
                  <p className="text-sm leading-relaxed text-ink/80">{analysis.findings}</p>
                </section>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const DraftingTool = ({ activeProject, notes, citations, onRefresh }: { activeProject: Project, notes: Note[], citations: Citation[], onRefresh: () => void }) => {
  const [outline, setOutline] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft] = useState('');

  const handleGenerateDraft = async () => {
    if (!outline.trim()) return;
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      // Prepare context from existing notes and citations
      const context = `
        PROJECT TITLE: ${activeProject.title}
        EXISTING NOTES: ${notes.map(n => n.content).join('\n')}
        CITATIONS: ${citations.map(c => `${c.authors} (${c.year}). ${c.title}`).join('\n')}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Based on the following outline and project context, generate a high-quality academic draft. 
        Ensure scholarly tone, proper structure, and integrate existing citations where relevant.
        
        OUTLINE/KEY POINTS:
        ${outline}
        
        CONTEXT:
        ${context}`,
        config: {
          systemInstruction: "You are an expert academic writer. Your goal is to transform outlines into polished, scholarly prose. Use formal language, maintain logical flow, and ensure academic integrity."
        }
      });
      
      setDraft(response.text || "Failed to generate draft.");
    } catch (error) {
      console.error(error);
      alert("Failed to generate draft.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!draft) return;
    
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: activeProject.id,
        title: `Draft: ${new Date().toLocaleDateString()}`,
        content: draft,
        type: 'draft'
      })
    });

    onRefresh();
    alert("Draft saved to project notes!");
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-bg/30">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-ink rounded-2xl shadow-xl border border-line p-8 mb-8">
          <h2 className="font-serif font-bold text-2xl text-accent mb-2">AI Drafting Assistant</h2>
          <p className="text-ink/60 dark:text-ink/40 text-sm mb-6 font-serif italic">"The pen is the tongue of the mind."</p>
          
          <div className="space-y-4">
            <textarea 
              value={outline}
              onChange={(e) => setOutline(e.target.value)}
              placeholder="Enter your outline, key points, or research questions here..."
              rows={6}
              className="w-full px-4 py-3 bg-bg dark:bg-bg/5 border border-line rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none"
            />
            <div className="flex justify-end">
              <button 
                onClick={handleGenerateDraft}
                disabled={isLoading || !outline.trim()}
                className="px-6 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent/90 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-accent/20"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <PenTool size={20} />}
                <span>Generate Draft</span>
              </button>
            </div>
          </div>
        </div>

        {draft && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-ink rounded-2xl shadow-xl border border-line p-8"
          >
            <div className="flex justify-between items-center mb-6 border-b border-line pb-4">
              <h3 className="font-serif font-bold text-xl text-accent">Generated Manuscript Draft</h3>
              <button 
                onClick={saveDraft}
                className="px-4 py-2 bg-accent-warm text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-accent-warm/90 transition-all shadow-lg shadow-accent-warm/20 flex items-center gap-2"
              >
                <CheckCircle size={14} />
                <span>Save to Project</span>
              </button>
            </div>
            <div className="markdown-body dark:prose-invert">
              <Markdown>{draft}</Markdown>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const ChatMessage = ({ role, content }: { role: 'user' | 'assistant', content: string }) => {
  return (
    <div className={cn(
      "flex gap-4 mb-6",
      role === 'user' ? "flex-row-reverse" : "flex-row"
    )}>
      <div className={cn(
        "w-8 h-8 rounded flex items-center justify-center flex-shrink-0 shadow-sm",
        role === 'user' ? "bg-accent text-white" : "bg-ink text-white"
      )}>
        {role === 'user' ? "U" : "AI"}
      </div>
      <div className={cn(
        "max-w-[80%] p-5 rounded-xl",
        role === 'user' ? "bg-accent text-white shadow-md shadow-accent/10" : "bg-white border border-line shadow-md shadow-ink/5"
      )}>
        <div className={cn("markdown-body", role === 'user' && "text-white prose-invert")}>
          <Markdown>{content}</Markdown>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>('librarian');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [view, setView] = useState<'chat' | 'lit-review' | 'citations' | 'drafting' | 'pdf-analysis'>('chat');
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('scholar-sync-theme') === 'dark' || 
             window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('scholar-sync-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('scholar-sync-theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (activeProject) {
      fetchProjectData(activeProject.id);
      setMessages([{ 
        role: 'assistant', 
        content: `Assalamu Alaikum! I am your research assistant for **${activeProject.title}**. I'm currently in **${AGENT_CONFIGS[agentMode].name}** mode. How can I assist you in your scholarly pursuits today?` 
      }]);
    }
  }, [activeProject, agentMode]);

  const fetchProjects = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data);
    if (data.length > 0 && !activeProject) {
      setActiveProject(data[0]);
    }
  };

  const fetchProjectData = async (id: number) => {
    const [notesRes, citationsRes] = await Promise.all([
      fetch(`/api/projects/${id}/notes`),
      fetch(`/api/projects/${id}/citations`)
    ]);
    setNotes(await notesRes.json());
    setCitations(await citationsRes.json());
  };

  const handleNewProject = async () => {
    const title = prompt("Enter project title:");
    if (!title) return;
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: "" })
    });
    const { id } = await res.json();
    fetchProjects();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !activeProject) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const projectContext = `
Current Project: ${activeProject.title}
Saved Citations:
${citations.map(c => `- ${c.title} (${c.year}) by ${c.authors}. Abstract: ${c.abstract || 'N/A'}`).join('\n')}

Saved Notes:
${notes.map(n => `- ${n.title} (${n.type}): ${n.content.substring(0, 200)}...`).join('\n')}
      `;

      const saveNoteFn = {
        name: "saveNote",
        parameters: {
          type: Type.OBJECT,
          description: "Save a research note, draft, or summary to the current project.",
          properties: {
            title: { type: Type.STRING, description: "The title of the note." },
            content: { type: Type.STRING, description: "The content of the note in markdown format." },
            type: { type: Type.STRING, enum: ["note", "draft", "summary"], description: "The type of note." }
          },
          required: ["title", "content", "type"]
        }
      };

      const saveCitationFn = {
        name: "saveCitation",
        parameters: {
          type: Type.OBJECT,
          description: "Save a research citation to the current project.",
          properties: {
            title: { type: Type.STRING, description: "The title of the paper." },
            authors: { type: Type.STRING, description: "The authors of the paper." },
            year: { type: Type.STRING, description: "The publication year." },
            url: { type: Type.STRING, description: "The URL to the paper." },
            doi: { type: Type.STRING, description: "The DOI of the paper." },
            abstract: { type: Type.STRING, description: "A brief abstract or summary of the paper." },
            citation_count: { type: Type.NUMBER, description: "The number of citations the paper has received." }
          },
          required: ["title", "authors", "year"]
        }
      };

      const model = ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: AGENT_CONFIGS[agentMode].instruction + 
            "\n\nPROJECT CONTEXT:\n" + projectContext + 
            "\n\nWhen you find a relevant paper or want to save a note/draft, use the provided tools to save them to the project database.",
          tools: [
            { googleSearch: {} },
            { functionDeclarations: [saveNoteFn, saveCitationFn] }
          ]
        }
      });

      const response = await model;
      
      // Handle function calls
      if (response.functionCalls) {
        for (const call of response.functionCalls) {
          if (call.name === 'saveNote') {
            await fetch('/api/notes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...call.args, project_id: activeProject.id })
            });
          } else if (call.name === 'saveCitation') {
            await fetch('/api/citations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...call.args, project_id: activeProject.id })
            });
          }
        }
        // Refresh data after saving
        fetchProjectData(activeProject.id);
      }

      const text = response.text || (response.functionCalls ? "I've saved that information to your project." : "I'm sorry, I couldn't generate a response.");
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Error: Failed to connect to the AI service." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const [rightSidebarTab, setRightSidebarTab] = useState<'notes' | 'citations'>('notes');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const handleExport = () => {
    if (!activeProject) return;
    const content = `
# Project: ${activeProject.title}
Generated on: ${new Date().toLocaleDateString()}

## Notes & Drafts
${notes.map(n => `### ${n.title} (${n.type})\n${n.content}\n`).join('\n')}

## Citations
${citations.map(c => `- ${c.title} by ${c.authors} (${c.year}) ${c.url ? `[Link](${c.url})` : ''}`).join('\n')}
    `;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProject.title.replace(/\s+/g, '_')}_export.md`;
    a.click();
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this project?")) return;
    await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (activeProject?.id === id) setActiveProject(null);
    fetchProjects();
  };

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar 
        projects={projects} 
        activeProject={activeProject} 
        onSelectProject={setActiveProject} 
        onNewProject={handleNewProject} 
        onDeleteProject={handleDeleteProject}
      />
      
      <FloatingAssistant />
      
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-line bg-white flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-6">
            <h2 className="font-serif font-bold text-xl truncate max-w-md text-accent">
              {activeProject?.title || "Select a Project"}
            </h2>
            
            <div className="flex items-center bg-bg p-1 rounded-lg border border-line">
              <button 
                onClick={() => setView('chat')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2",
                  view === 'chat' ? "bg-white text-accent shadow-sm" : "text-ink/40 hover:text-ink/60"
                )}
              >
                <MessageSquare size={14} />
                <span>Chat</span>
              </button>
              <button 
                onClick={() => setView('lit-review')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2",
                  view === 'lit-review' ? "bg-white text-accent shadow-sm" : "text-ink/40 hover:text-ink/60"
                )}
              >
                <Library size={14} />
                <span>Lit Review</span>
              </button>
              <button 
                onClick={() => setView('citations')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2",
                  view === 'citations' ? "bg-white text-accent shadow-sm" : "text-ink/40 hover:text-ink/60"
                )}
              >
                <FileText size={14} />
                <span>Citations</span>
              </button>
              <button 
                onClick={() => setView('drafting')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2",
                  view === 'drafting' ? "bg-white text-accent shadow-sm" : "text-ink/40 hover:text-ink/60"
                )}
              >
                <PenTool size={14} />
                <span>Drafting</span>
              </button>
              <button 
                onClick={() => setView('pdf-analysis')}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2",
                  view === 'pdf-analysis' ? "bg-white text-accent shadow-sm" : "text-ink/40 hover:text-ink/60"
                )}
              >
                <UploadCloud size={14} />
                <span>PDF Analysis</span>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-line rounded-lg text-ink/60 hover:text-accent transition-all"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <div className="flex items-center gap-2 bg-line/50 p-1 rounded-lg">
              {(Object.keys(AGENT_CONFIGS) as AgentMode[]).map((mode) => {
              const config = AGENT_CONFIGS[mode];
              const Icon = { Library, BarChart, PenTool, CheckCircle, MessageSquare }[config.icon as any] || MessageSquare;
              return (
                <button
                  key={mode}
                  onClick={() => setAgentMode(mode)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    agentMode === mode 
                      ? "bg-white text-accent shadow-sm" 
                      : "text-ink/50 hover:text-ink"
                  )}
                  title={config.name}
                >
                  <Icon size={14} />
                  <span className="hidden md:inline">{config.name.split(' ')[1]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {view === 'chat' ? (
            <div className="flex-1 flex flex-col border-r border-line bg-white/50">
              <div className="flex-1 overflow-y-auto p-6">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-40">
                    <div className="w-16 h-16 border-2 border-dashed border-ink rounded-full flex items-center justify-center mb-4">
                      <Search size={32} />
                    </div>
                    <h3 className="font-serif text-xl mb-2">Start your research journey</h3>
                    <p className="max-w-xs text-sm">Ask a question, search for papers, or start drafting your next publication.</p>
                  </div>
                ) : (
                  messages.map((m, i) => <ChatMessage key={i} {...m} />)
                )}
                {isLoading && (
                  <div className="flex gap-4 mb-6">
                    <div className="w-8 h-8 bg-ink rounded flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Loader2 className="text-white animate-spin" size={16} />
                    </div>
                    <div className="bg-white border border-line p-4 rounded-lg shadow-sm">
                      <p className="text-sm text-ink/50 italic">Thinking...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-line bg-white">
                <form onSubmit={handleSendMessage} className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Ask ${AGENT_CONFIGS[agentMode].name}...`}
                    className="w-full pl-4 pr-12 py-3 bg-bg border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-accent text-white rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={20} />
                  </button>
                </form>
                <p className="text-[10px] text-ink/40 mt-2 text-center uppercase tracking-widest">
                  Powered by Gemini 3.1 Pro • Grounded in Google Search
                </p>
              </div>
            </div>
          ) : view === 'lit-review' ? (
            activeProject ? (
              <LiteratureReviewTool 
                activeProject={activeProject} 
                onRefresh={() => fetchProjectData(activeProject.id)} 
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-12 text-center opacity-40">
                <div>
                  <BookOpen size={48} className="mx-auto mb-4" />
                  <h3 className="font-serif text-xl">Select a project to use the Lit Review tool</h3>
                </div>
              </div>
            )
          ) : view === 'citations' ? (
            activeProject ? (
              <CitationManager 
                activeProject={activeProject} 
                citations={citations} 
                onRefresh={() => fetchProjectData(activeProject.id)} 
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-12 text-center opacity-40">
                <div>
                  <Library size={48} className="mx-auto mb-4" />
                  <h3 className="font-serif text-xl">Select a project to manage citations</h3>
                </div>
              </div>
            )
          ) : view === 'drafting' ? (
            activeProject ? (
              <DraftingTool 
                activeProject={activeProject} 
                notes={notes}
                citations={citations}
                onRefresh={() => fetchProjectData(activeProject.id)} 
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-12 text-center opacity-40">
                <div>
                  <PenTool size={48} className="mx-auto mb-4" />
                  <h3 className="font-serif text-xl">Select a project to use the Drafting tool</h3>
                </div>
              </div>
            )
          ) : (
            activeProject ? (
              <PDFAnalysisTool 
                activeProject={activeProject} 
                onRefresh={() => fetchProjectData(activeProject.id)} 
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-12 text-center opacity-40">
                <div>
                  <UploadCloud size={48} className="mx-auto mb-4" />
                  <h3 className="font-serif text-xl">Select a project to analyze PDFs</h3>
                </div>
              </div>
            )
          )}

          {/* Sidebar for Notes & Citations */}
          <div className="w-80 flex flex-col bg-white overflow-hidden">
            <div className="flex border-b border-line">
              <button 
                onClick={() => setRightSidebarTab('notes')}
                className={cn(
                  "flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all",
                  rightSidebarTab === 'notes' ? "border-b-2 border-accent text-accent" : "text-ink/40 hover:text-ink"
                )}
              >
                Notes
              </button>
              <button 
                onClick={() => setRightSidebarTab('citations')}
                className={cn(
                  "flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all",
                  rightSidebarTab === 'citations' ? "border-b-2 border-accent text-accent" : "text-ink/40 hover:text-ink"
                )}
              >
                Citations
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {rightSidebarTab === 'notes' ? (
                  notes.length === 0 ? (
                    <div className="text-center py-12 text-ink/30 italic text-sm">No notes yet.</div>
                  ) : (
                    notes.map(note => (
                      <div 
                        key={note.id} 
                        onClick={() => setSelectedNote(note)}
                        className="p-3 border border-line rounded-lg hover:border-accent/30 transition-all cursor-pointer group relative"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm truncate pr-4">{note.title}</h4>
                          <span className="text-[10px] uppercase tracking-tighter text-ink/40">{note.type}</span>
                        </div>
                        <p className="text-xs text-ink/60 line-clamp-2">{note.content}</p>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!confirm("Delete note?")) return;
                            await fetch(`/api/notes/${note.id}`, { method: 'DELETE' });
                            fetchProjectData(activeProject!.id);
                          }}
                          className="absolute right-2 bottom-2 p-1 text-ink/0 group-hover:text-ink/30 hover:text-red-500 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )
                ) : (
                  citations.length === 0 ? (
                    <div className="text-center py-12 text-ink/30 italic text-sm">No citations yet.</div>
                  ) : (
                    citations.map(citation => (
                      <div key={citation.id} className="p-3 border border-line rounded-lg hover:border-accent/30 transition-all cursor-pointer group relative">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm truncate pr-4">{citation.title}</h4>
                          <span className="text-[10px] uppercase tracking-tighter text-ink/40">{citation.year}</span>
                        </div>
                        <p className="text-xs text-ink/60 line-clamp-1 italic">{citation.authors}</p>
                        <div className="mt-2 flex items-center justify-between">
                          {citation.url && (
                            <a 
                              href={citation.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] text-accent hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={10} />
                              <span>View Paper</span>
                            </a>
                          )}
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm("Delete citation?")) return;
                              await fetch(`/api/citations/${citation.id}`, { method: 'DELETE' });
                              fetchProjectData(activeProject!.id);
                            }}
                            className="p-1 text-ink/0 group-hover:text-ink/30 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
            
            <div className="p-4 border-t border-line bg-accent/5">
              <button 
                onClick={handleExport}
                className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
              >
                <FileText size={14} />
                <span>Export Project</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Note Modal */}
      <AnimatePresence>
        {selectedNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-line flex items-center justify-between">
                <div>
                  <h3 className="font-serif font-bold text-xl">{selectedNote.title}</h3>
                  <span className="text-xs uppercase tracking-widest text-ink/40">{selectedNote.type}</span>
                </div>
                <button 
                  onClick={() => setSelectedNote(null)}
                  className="p-2 hover:bg-line rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <div className="markdown-body">
                  <Markdown>{selectedNote.content}</Markdown>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
