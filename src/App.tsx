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
  X
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
      
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-line bg-white flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="font-serif font-bold text-xl truncate max-w-md text-accent">
              {activeProject?.title || "Select a Project"}
            </h2>
          </div>
          
          <div className="flex items-center gap-2 bg-line/50 p-1 rounded-lg">
            {(Object.keys(AGENT_CONFIGS) as AgentMode[]).map((mode) => {
              const config = AGENT_CONFIGS[mode];
              const Icon = { Library, BarChart, PenTool, CheckCircle }[config.icon as any] || MessageSquare;
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
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Chat / Work Area */}
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
                  <div className="w-8 h-8 bg-ink rounded flex items-center justify-center flex-shrink-0">
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
