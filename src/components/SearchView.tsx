import React, { useState, useMemo } from 'react';
import { Task, Note, ViewState } from '../types';
import { Search, CheckSquare, FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../utils';

interface Props {
  tasks: Task[];
  notes: Note[];
  navigate: (v: ViewState) => void;
}

export default function SearchView({ tasks, notes, navigate }: Props) {
  const [query, setQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!query.trim()) return { tasks: [], notes: [] };
    const q = query.toLowerCase();
    
    return {
      tasks: tasks.filter(t => t.title.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)),
      notes: notes.filter(n => n.title.toLowerCase().includes(q) || n.subject.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    };
  }, [tasks, notes, query]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight mb-4">Global Search</h2>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
          <input 
            type="text"
            autoFocus
            className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-lg text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 transition-shadow outline-none"
            placeholder="Search tasks, notes, subjects..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </header>

      {query.trim() ? (
        <div className="space-y-8">
          {searchResults.tasks.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" /> Tasks ({searchResults.tasks.length})
              </h3>
              <div className="space-y-2">
                {searchResults.tasks.map(task => (
                  <div key={task.id} onClick={() => navigate('tasks')} className="bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-xl p-4 cursor-pointer transition flex items-center justify-between group">
                    <div>
                      <p className={`font-medium ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{task.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{task.subject} {task.dueDate ? `• ${formatDate(task.dueDate)}` : ''}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {searchResults.notes.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Notes ({searchResults.notes.length})
              </h3>
              <div className="space-y-2">
                {searchResults.notes.map(note => (
                  <div key={note.id} onClick={() => navigate('notes')} className="bg-slate-900/50 hover:bg-slate-800 border border-slate-800 rounded-xl p-4 cursor-pointer transition flex items-center justify-between group">
                    <div>
                      <p className="font-medium text-slate-200">{note.title || 'Untitled Note'}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{note.content}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {searchResults.tasks.length === 0 && searchResults.notes.length === 0 && (
             <div className="text-center py-12">
               <p className="text-slate-500 text-lg">No results found for "{query}"</p>
             </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
           <Search className="w-12 h-12 text-slate-800 mx-auto mb-4" />
           <p className="text-slate-500">Start typing to search across your workspace</p>
        </div>
      )}
    </div>
  );
}
