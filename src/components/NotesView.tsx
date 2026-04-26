import React, { useState, useMemo } from 'react';
import { Note, Task } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Plus, X, Tag, Link, Filter, Eye, Edit3, Zap } from 'lucide-react';
import { formatDate, generateId } from '../utils';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import Markdown from 'react-markdown';

interface Props {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  tasks: Task[];
}

export default function NotesView({ notes, setNotes, tasks }: Props) {
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [filterSubject, setFilterSubject] = useState('');
  const [sortByPinned, setSortByPinned] = useState(true);

  const handleSave = async (noteDetails: Partial<Note>) => {
    if (!auth.currentUser) return;

    if (selectedNote) {
      const updatedNote = { ...selectedNote, ...noteDetails, updatedAt: Date.now() };
      try {
        await setDoc(doc(db, 'notes', selectedNote.id), updatedNote, { merge: true });
        setSelectedNote(null);
        setIsAdding(false);
      } catch (e) {
        console.error(e);
      }
    } else {
      const newNote: Note = {
        id: generateId(),
        userId: auth.currentUser.email!,
        title: noteDetails.title || 'Untitled',
        subject: noteDetails.subject || 'General',
        content: noteDetails.content || '',
        taskId: noteDetails.taskId || null,
        updatedAt: Date.now(),
        pinned: !!noteDetails.pinned,
        color: noteDetails.color || null,
      };
      try {
        await setDoc(doc(db, 'notes', newNote.id), newNote);
        setIsAdding(false);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDelete = async (id: string) => {
      try {
        await deleteDoc(doc(db, 'notes', id));
        setSelectedNote(null);
      } catch (e) {
        console.error(e);
      }
  };

  const uniqueSubjects = Array.from(new Set(notes.map(n => n.subject)));
  let filteredNotes = notes.filter(n => filterSubject ? n.subject.toLowerCase() === filterSubject.toLowerCase() : true);
  
  if (sortByPinned) {
    filteredNotes.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }

  const togglePin = async (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    try {
      await setDoc(doc(db, 'notes', note.id), { pinned: !note.pinned }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Study Notes</h2>
          <p className="text-slate-400 mt-1">Capture your thoughts and learnings.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus-within:border-indigo-500 transition-colors">
             <Filter className="w-4 h-4 text-slate-500" />
             <select 
               className="bg-transparent border-none text-sm p-0 focus:ring-0 max-w-[120px]"
               value={filterSubject}
               onChange={(e) => setFilterSubject(e.target.value)}
             >
                <option value="">All Subjects</option>
                {uniqueSubjects.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
             </select>
           </div>
          <button 
            onClick={() => {
              setSelectedNote(null);
              setIsAdding(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>
      </header>

      {(isAdding || selectedNote) ? (
        <NoteEditor 
          note={selectedNote} 
          tasks={tasks}
          onSave={handleSave} 
          onCancel={() => {
            setSelectedNote(null);
            setIsAdding(false);
          }}
          onDelete={selectedNote ? () => handleDelete(selectedNote.id) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredNotes.map(note => {
              const linkedTask = tasks.find(t => t.id === note.taskId);
              return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className={`${note.color ? note.color : 'bg-slate-900/50'} hover:brightness-110 border ${note.pinned ? 'border-yellow-500/50' : 'border-slate-800/50'} rounded-2xl p-5 cursor-pointer transition-all flex flex-col h-48 relative overflow-hidden`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg line-clamp-1">{note.title || 'Untitled Note'}</h3>
                  <button onClick={(e) => togglePin(e, note)} className={`p-1 z-10 rounded-md transition-colors ${note.pinned ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-500 hover:text-yellow-400 hover:bg-slate-800'}`}>
                    <svg className="w-4 h-4" fill={note.pinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                  </button>
                </div>
                <div className="flex items-center flex-wrap gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-indigo-400" />
                    <span className="text-xs font-mono text-indigo-400">{note.subject || 'General'}</span>
                  </div>
                  {linkedTask && (
                    <div className="flex items-center gap-1.5 bg-indigo-900/20 px-2 py-0.5 rounded border border-indigo-800/30">
                      <Link className="w-3 h-3 text-indigo-400" />
                      <span className="text-[10px] text-indigo-300 truncate max-w-[100px]">{linkedTask.title}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 w-full overflow-hidden flex flex-col relative text-sm text-slate-400 line-clamp-3 mb-auto">
                  <div className="markdown-preview line-clamp-3 overflow-hidden">
                    <Markdown>{note.content || 'Empty note...'}</Markdown>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800/50 text-xs text-slate-500 font-mono">
                  Updated {formatDate(new Date(note.updatedAt).toISOString())}
                </div>
              </motion.div>
            )})}
          </AnimatePresence>
          {filteredNotes.length === 0 && (
            <div className="col-span-full p-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
              <p className="text-slate-500">No notes found. Start writing! ✍️</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NoteEditor({ 
  note,
  tasks,
  onSave, 
  onCancel,
  onDelete
}: { 
  note: Note | null; 
  tasks: Task[];
  onSave: (note: Partial<Note>) => void; 
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(note?.title || '');
  const [subject, setSubject] = useState(note?.subject || '');
  const [content, setContent] = useState(note?.content || '');
  const [taskId, setTaskId] = useState(note?.taskId || '');
  const [pinned, setPinned] = useState(note?.pinned || false);
  const [color, setColor] = useState(note?.color || '');
  const [isPreview, setIsPreview] = useState(false);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  
  const filteredTasks = useMemo(() => {
     return tasks.filter(t => !subject || t.subject.toLowerCase() === subject.toLowerCase());
  }, [tasks, subject]);

  const handleSave = async () => {
    let finalTaskId = taskId;
    if (isCreatingTask && newTaskTitle.trim() && auth.currentUser) {
       const newTaskId = generateId();
       const newTask: Task = {
          id: newTaskId,
          userId: auth.currentUser.email!,
          title: newTaskTitle,
          subject: subject || 'General',
          dueDate: null,
          priority: null,
          completed: false,
          createdAt: Date.now(),
          subtasks: []
       };
       try {
         await setDoc(doc(db, 'tasks', newTaskId), newTask);
         finalTaskId = newTaskId;
       } catch (e) { console.error(e); }
    }

    onSave({
      title,
      subject,
      content,
      taskId: finalTaskId || null,
      updatedAt: Date.now(),
      pinned,
      color: color || null
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(content);
    alert('Note content copied to clipboard! (Link sharing feature requires backend URL support)');
  };

  const handlePrint = () => {
    setIsReadingMode(true);
    setTimeout(() => {
       window.print();
    }, 500);
  };

  if (isReadingMode) {
     return (
       <div className="fixed inset-0 bg-white text-black z-50 p-8 md:p-12 overflow-y-auto print:p-0">
          <div className="max-w-3xl mx-auto">
             <div className="flex justify-between items-center mb-8 print:hidden">
                <button onClick={() => setIsReadingMode(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-medium transition-colors">
                   Exit Reading Mode
                </button>
                <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium transition-colors">
                   Print to PDF
                </button>
             </div>
             <h1 className="text-4xl font-bold mb-4">{title || 'Untitled Note'}</h1>
             <div className="text-slate-500 mb-8 border-b pb-4 flex gap-4 font-mono text-sm">
                <span>Subject: {subject || 'General'}</span>
                <span>Date: {formatDate(new Date().toISOString())}</span>
             </div>
             <div className="markdown-preview prose prose-slate max-w-none">
                <Markdown>{content || '*Empty note...*'}</Markdown>
             </div>
          </div>
       </div>
     );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${color ? color : 'bg-slate-900'} border border-slate-800 rounded-2xl flex flex-col h-[600px] overflow-hidden shadow-2xl transition-colors`}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-2 flex-1">
          <button onClick={() => setPinned(!pinned)} className={`p-1.5 rounded-md transition-colors ${pinned ? 'text-yellow-400 bg-yellow-400/10' : 'text-slate-500 hover:text-yellow-400 hover:bg-slate-800'}`}>
            <svg className="w-5 h-5" fill={pinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
          </button>
          <input 
            type="text" 
            placeholder="Note Title" 
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-transparent border-none text-lg font-semibold focus:ring-0 text-white placeholder-slate-600 p-0 w-full md:w-auto"
          />
        </div>
        <div className="flex items-center gap-2">
           {onDelete && (
             <button onClick={onDelete} className="text-xs text-red-400 hover:bg-slate-800 px-3 py-1.5 rounded-lg transition-colors">
               Delete
             </button>
           )}
           <button onClick={onCancel} className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors">
             <X className="w-5 h-5" />
           </button>
           <button 
             onClick={handleSave}
             className="bg-white text-black text-sm font-medium px-4 py-1.5 rounded-lg ml-2 hover:bg-slate-200 transition-colors"
           >
             Save
           </button>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border-b border-slate-800 bg-slate-950/30">
        <div className="flex items-center gap-2 flex-1">
          <Tag className="w-4 h-4 text-slate-500" />
          <input 
            type="text"
            placeholder="Subject / Tag"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="bg-transparent border-none text-sm font-mono focus:ring-0 text-indigo-300 placeholder-slate-600 p-0 w-full"
          />
        </div>
        <div className="flex items-center gap-2 flex-1 relative">
          <Link className="w-4 h-4 text-slate-500" />
          {isCreatingTask ? (
             <div className="flex items-center gap-2 w-full">
               <input 
                 autoFocus
                 type="text"
                 placeholder="New Task Title"
                 value={newTaskTitle}
                 onChange={(e) => setNewTaskTitle(e.target.value)}
                 className="bg-transparent border border-slate-700 rounded-md text-sm px-2 py-1 focus:ring-1 ring-indigo-500 text-slate-300 w-full"
               />
               <button onClick={() => setIsCreatingTask(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
             </div>
          ) : (
            <select 
               className="bg-transparent border-none text-sm focus:ring-0 p-0 text-slate-300 w-full"
               value={taskId}
               onChange={(e) => {
                 if (e.target.value === 'CREATE_NEW') setIsCreatingTask(true);
                 else setTaskId(e.target.value);
               }}
             >
               <option value="">No linked task</option>
               <optgroup label="Actions">
                 <option value="CREATE_NEW">+ Create new task</option>
               </optgroup>
               <optgroup label="Filtered Tasks (By Subject)">
                 {filteredTasks.map(t => (
                   <option key={t.id} value={t.id}>{t.title}</option>
                 ))}
               </optgroup>
               {tasks.length > filteredTasks.length && (
                 <optgroup label="Other Tasks">
                   {tasks.filter(t => !filteredTasks.find(ft => ft.id === t.id)).map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                   ))}
                 </optgroup>
               )}
             </select>
          )}
        </div>
        <div className="flex items-center gap-2">
           <select 
             value={color} 
             onChange={(e) => setColor(e.target.value)}
             className="bg-transparent border-none text-sm p-0 focus:ring-0 text-slate-300 ml-2"
           >
             <option value="">Default Color</option>
             <option value="bg-red-900/30">Red</option>
             <option value="bg-orange-900/30">Orange</option>
             <option value="bg-emerald-900/30">Green</option>
             <option value="bg-blue-900/30">Blue</option>
             <option value="bg-purple-900/30">Purple</option>
           </select>
        </div>
      </div>
      
      <div className="flex justify-between items-center px-4 pt-2">
         <div className="flex items-center gap-3">
             <button
               onClick={handleCopyLink}
               className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
             >
               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copy
             </button>
             <button
               onClick={handlePrint}
               className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
             >
               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> Print
             </button>
             <button
               onClick={() => setIsReadingMode(true)}
               className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
             >
               <Eye className="w-3.5 h-3.5" /> Read Mode
             </button>
         </div>

         <div className="flex items-center">
           <button 
             onClick={() => setIsPreview(!isPreview)}
             className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors ml-4"
           >
             {isPreview ? <><Edit3 className="w-3.5 h-3.5" /> Edit Markdown</> : <><Eye className="w-3.5 h-3.5" /> Preview Markdown</>}
           </button>
         </div>
      </div>

      {isPreview ? (
        <div className="flex-1 w-full overflow-y-auto p-6 text-slate-200 markdown-preview space-y-4">
           <Markdown>{content || '*Empty note...*'}</Markdown>
        </div>
      ) : (
        <textarea
          placeholder="Start typing your notes here (Markdown supported)..."
          value={content}
          onChange={e => setContent(e.target.value)}
          className="flex-1 w-full bg-transparent border-none resize-none p-6 text-slate-300 focus:ring-0 font-sans leading-relaxed"
        />
      )}
    </motion.div>
  );
}
