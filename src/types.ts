export interface Project {
  id: number;
  title: string;
  description: string;
  created_at: string;
}

export interface Note {
  id: number;
  project_id: number;
  title: string;
  content: string;
  type: 'note' | 'draft' | 'summary';
  created_at: string;
}

export interface Citation {
  id: number;
  project_id: number;
  title: string;
  authors: string;
  year: string;
  url: string;
  doi: string;
  abstract: string;
  citation_count: number;
  created_at: string;
}

export type AgentMode = 'librarian' | 'analyst' | 'scribe' | 'reviewer';
