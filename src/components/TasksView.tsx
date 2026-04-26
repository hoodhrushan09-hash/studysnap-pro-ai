import React, { useState } from 'react';
import { UserProfile, Task, Priority, Note, ViewState } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, Clock, Library, X, AlertCircle, ArrowDownAZ, FileText, ChevronRight, Filter, Flame, Target, Circle, Calendar as CalendarIcon } from 'lucide-react';
import { formatDate, generateId } from '../utils';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface Props {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>; // Kept for type signature but we will mainly hit Firestore
  notes?: Note[];
  userProfile?: UserProfile | null;
  navigate?: (view: ViewState) => void;
}

export default function TasksView({ tasks, setTasks, notes = [], userProfile, navigate }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPriority, setNewPriority] = useState<Priority | null>(null);
  const [newReminderTime, setNewReminderTime] = useState('');
  const [newDifficulty, setNewDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);
  const [newRecurring, setNewRecurring] = useState<'none' | 'daily' | 'weekly' | null>(null);

  const [filterSubject, setFilterSubject] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  const [sortByPriority, setSortByPriority] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newDocs = new Set(selectedIds);
    if (newDocs.has(id)) newDocs.delete(id);
    else newDocs.add(id);
    setSelectedIds(newDocs);
  };

  const handleBulkComplete = async () => {
     for (const id of Array.from(selectedIds)) {
        try {
          await updateDoc(doc(db, 'tasks', id), { completed: true });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `tasks/${id}`);
        }
     }
     setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
     for (const id of Array.from(selectedIds)) {
        try {
          await deleteDoc(doc(db, 'tasks', id));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `tasks/${id}`);
        }
     }
     setSelectedIds(new Set());
  };
  
  const handleBulkPriority = async (p: Priority) => {
     for (const id of Array.from(selectedIds)) {
        try {
          await updateDoc(doc(db, 'tasks', id), { priority: p });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `tasks/${id}`);
        }
     }
     setSelectedIds(new Set());
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !auth.currentUser) return;
    
    const newTask: Task = {
      id: generateId(),
      userId: auth.currentUser.email!,
      title: newTitle,
      subject: newSubject || 'General',
      dueDate: newDueDate || null,
      priority: newPriority,
      reminderTime: newReminderTime || null,
      completed: false,
      createdAt: Date.now(),
      subtasks: [],
      difficulty: newDifficulty,
      recurring: newRecurring
    };
    
    try {
      await setDoc(doc(db, 'tasks', newTask.id), newTask);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, `tasks/${newTask.id}`);
    }
    
    setNewTitle('');
    setNewSubject('');
    setNewDueDate('');
    setNewPriority(null);
    setNewReminderTime('');
    setNewDifficulty(null);
    setNewRecurring(null);
    setIsAdding(false);
  };

  const addXP = async (amount: number) => {
    if (!auth.currentUser) return;
    const currentXP = userProfile?.xp || 0;
    const currentLevel = userProfile?.level || 1;
    const newXP = currentXP + amount;
    const xpNeeded = currentLevel * 1000;
    
    let nextLevel = currentLevel;
    let finalXP = newXP;
    
    if (newXP >= xpNeeded) {
      nextLevel += 1;
      finalXP = newXP - xpNeeded;
    }
    
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.email!), {
        xp: finalXP,
        level: nextLevel,
        coins: (userProfile?.coins || 0) + 10 // Award some coins too
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${auth.currentUser.email}`);
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const willComplete = !task.completed;
      await updateDoc(doc(db, 'tasks', task.id), { completed: willComplete });
      if (willComplete) {
         let xpEarned = 50; // Base XP
         if (task.priority === 'high') xpEarned += 100; // Bonus for hard tasks
         else if (task.priority === 'medium') xpEarned += 50;
         await addXP(xpEarned);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `tasks/${id}`);
    }
  };

  const filteredTasksBySubject = tasks.filter(t => filterSubject ? t.subject.toLowerCase() === filterSubject.toLowerCase() : true);
  
  const filteredTasks = filteredTasksBySubject.filter(t => {
     if (!filterDate) return true;
     if (filterDate === 'noDueDate') return !t.dueDate;
     if (!t.dueDate) return false;
     
     const due = new Date(t.dueDate);
     const today = new Date();
     
     if (filterDate === 'today') {
        return due.toDateString() === today.toDateString();
     } else if (filterDate === 'thisWeek') {
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        return due >= startOfWeek && due <= endOfWeek;
     } else if (filterDate === 'thisMonth') {
        return due.getMonth() === new Date().getMonth() && due.getFullYear() === new Date().getFullYear();
     }
     return true;
  });
  
  let pendingTasks = filteredTasks.filter(t => !t.completed);
  if (sortByPriority) {
    const priorityWeight = { high: 3, medium: 2, low: 1, null: 0 };
    pendingTasks.sort((a, b) => {
      const wA = priorityWeight[a.priority || 'null'];
      const wB = priorityWeight[b.priority || 'null'];
      return wB - wA;
    });
  }

  const completedTasks = filteredTasks.filter(t => t.completed);

  const uniqueSubjects = Array.from(new Set(tasks.map(t => t.subject)));

  // Time-based grouping
  const now = new Date();
  now.setHours(0,0,0,0);

  const overdueTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) < now);
  const todayTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === now.toDateString());
  const upcomingTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate) > now);
  const noDueDateTasks = pendingTasks.filter(t => !t.dueDate);

  const renderTaskList = (list: Task[], title: string, colorClass: string = "text-slate-200") => {
    if (list.length === 0) return null;
    return (
      <section className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <h3 className={`font-semibold text-lg ${colorClass}`}>{title}</h3>
          <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full font-mono">{list.length}</span>
        </div>
        <div className="space-y-2">
          <AnimatePresence>
            {list.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onToggle={() => toggleTask(task)} 
                onDelete={() => deleteTask(task.id)} 
                notes={notes.filter(n => n.taskId === task.id)}
                navigate={navigate}
                selected={selectedIds.has(task.id)}
                onSelect={() => toggleSelection(task.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Your Tasks</h2>
          <p className="text-slate-400 mt-1">Organize your study goals.</p>
        </div>
        <div className="flex items-center gap-3">
           {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 mr-4 bg-indigo-900/40 px-3 py-1.5 rounded-lg border border-indigo-500/50">
                 <span className="text-sm font-medium text-indigo-300">{selectedIds.size} selected</span>
                 <button onClick={handleBulkComplete} className="p-1 hover:bg-slate-800 rounded bg-indigo-500/20 text-indigo-300 ml-2" title="Mark Complete"><Check className="w-4 h-4" /></button>
                 <button onClick={handleBulkDelete} className="p-1 hover:bg-slate-800 rounded bg-red-500/20 text-red-400" title="Delete"><X className="w-4 h-4" /></button>
                 <select onChange={(e) => handleBulkPriority(e.target.value as Priority)} className="bg-transparent text-sm border-none focus:ring-0 p-0 text-slate-300 ml-2 w-28">
                    <option value="">Set Priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                 </select>
              </div>
           )}
           <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus-within:border-indigo-500 transition-colors">
             <CalendarIcon className="w-4 h-4 text-slate-500" />
             <select 
               className="bg-transparent border-none text-sm p-0 focus:ring-0 max-w-[120px]"
               value={filterDate}
               onChange={(e) => setFilterDate(e.target.value)}
             >
                <option value="">Any Date</option>
                <option value="today">Today</option>
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
                <option value="noDueDate">No Due Date</option>
             </select>
           </div>
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
            onClick={() => setSortByPriority(!sortByPriority)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 border ${sortByPriority ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'}`}
          >
            <ArrowDownAZ className="w-4 h-4" />
            Sort by Priority
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Cancel' : 'New Task'}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isAdding && (
          <motion.form 
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            onSubmit={handleAddTask}
            className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 overflow-hidden"
          >
            <div className="space-y-4">
              <div>
                <input 
                  type="text" 
                  placeholder="What do you need to study? 📚"
                  className="w-full bg-transparent border-none text-xl font-medium focus:ring-0 p-0 text-white placeholder-slate-600"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-3 items-center border-t border-slate-800/50 pt-4 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1.5 focus-within:ring-1 ring-indigo-500 flex-1 sm:flex-none">
                  <Library className="w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Subject (e.g. Math)"
                    className="bg-transparent border-none text-sm w-full sm:w-32 focus:ring-0 p-0 text-slate-300 placeholder-slate-500"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1.5 focus-within:ring-1 ring-indigo-500 flex-1 sm:flex-none">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <input 
                    type="date"
                    className="bg-transparent border-none text-sm w-full sm:w-32 focus:ring-0 p-0 text-slate-300 placeholder-slate-500 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.5]"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1.5 focus-within:ring-1 ring-indigo-500 flex-1 sm:flex-none">
                   <AlertCircle className="w-4 h-4 text-slate-400" />
                   <input
                     type="time"
                     className="bg-transparent border-none text-sm w-full sm:w-24 focus:ring-0 p-0 text-slate-300 placeholder-slate-500 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.5]"
                     value={newReminderTime}
                     onChange={(e) => setNewReminderTime(e.target.value)}
                     placeholder="Reminder Time"
                   />
                </div>
                
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1.5">
                   <select 
                     className="bg-transparent border-none text-sm focus:ring-0 p-0 text-slate-300 placeholder-slate-500"
                     value={newPriority || ''}
                     onChange={(e) => setNewPriority((e.target.value as Priority) || null)}
                   >
                     <option value="" className="bg-slate-900">Priority</option>
                     <option value="high" className="bg-slate-900 text-red-400">High</option>
                     <option value="medium" className="bg-slate-900 text-orange-400">Medium</option>
                     <option value="low" className="bg-slate-900 text-indigo-400">Low</option>
                   </select>
                </div>

                <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1.5 focus-within:ring-1 ring-indigo-500 flex-1 sm:flex-none w-full sm:w-auto mt-2 sm:mt-0">
                   <select 
                     className="bg-transparent border-none text-sm focus:ring-0 p-0 text-slate-300 placeholder-slate-500 w-full"
                     value={newDifficulty || ''}
                     onChange={(e) => setNewDifficulty((e.target.value as any) || null)}
                   >
                     <option value="" className="bg-slate-900">Difficulty</option>
                     <option value="easy" className="bg-slate-900">Easy 🟢</option>
                     <option value="medium" className="bg-slate-900">Medium 🟡</option>
                     <option value="hard" className="bg-slate-900">Hard 🔴</option>
                   </select>
                </div>
                
                <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-1.5 focus-within:ring-1 ring-indigo-500 flex-1 sm:flex-none w-full sm:w-auto mt-2 sm:mt-0">
                   <select 
                     className="bg-transparent border-none text-sm focus:ring-0 p-0 text-slate-300 placeholder-slate-500 w-full"
                     value={newRecurring || ''}
                     onChange={(e) => setNewRecurring((e.target.value as any) || null)}
                   >
                     <option value="" className="bg-slate-900">Once</option>
                     <option value="daily" className="bg-slate-900">Daily</option>
                     <option value="weekly" className="bg-slate-900">Weekly</option>
                   </select>
                </div>

                <button 
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="w-full sm:w-auto ml-auto bg-white text-black px-5 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity mt-2 sm:mt-0"
                >
                  Save
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {pendingTasks.length === 0 ? (
          <p className="text-slate-500 italic text-sm mt-8">No pending tasks. You're chilling! 🧊</p>
        ) : (
          <>
            {renderTaskList(overdueTasks, "Overdue 🔴", "text-red-400")}
            {renderTaskList(todayTasks, "Today ⚡", "text-emerald-400")}
            {renderTaskList(upcomingTasks, "Upcoming 📅", "text-slate-100")}
            {renderTaskList(noDueDateTasks, "Someday 💭", "text-slate-400")}
          </>
        )}

        {completedTasks.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="font-semibold text-lg text-slate-400">Completed</h3>
              <span className="bg-slate-800/50 text-slate-500 text-xs px-2 py-0.5 rounded-full font-mono">{completedTasks.length}</span>
            </div>
            <div className="space-y-2 opacity-60">
              <AnimatePresence>
                {completedTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={() => toggleTask(task)} 
                    onDelete={() => deleteTask(task.id)}
                    notes={notes.filter(n => n.taskId === task.id)}
                    navigate={navigate}
                    selected={selectedIds.has(task.id)}
                    onSelect={() => toggleSelection(task.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const TaskItem: React.FC<{ task: Task; onToggle: () => void; onDelete: () => void; notes: Note[]; navigate?: (view: ViewState) => void, selected: boolean, onSelect: () => void }> = ({ task, onToggle, onDelete, notes, navigate, selected, onSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const [desc, setDesc] = useState(task.description || '');
  const [reminderTime, setReminderTime] = useState(task.reminderTime || '');

  const saveDesc = async () => {
    if (desc !== task.description) {
       try {
         await updateDoc(doc(db, 'tasks', task.id), { description: desc });
       } catch (e) {
         handleFirestoreError(e, OperationType.UPDATE, `tasks/${task.id}`);
       }
    }
  };

  const saveReminder = async () => {
      if (reminderTime !== task.reminderTime) {
         try {
           await updateDoc(doc(db, 'tasks', task.id), { reminderTime: reminderTime || null });
         } catch (e) {
           handleFirestoreError(e, OperationType.UPDATE, `tasks/${task.id}`);
         }
      }
  };

  const handleAddSubtask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('subtask') as HTMLInputElement;
    if (!input.value.trim()) return;

    const newSubtasks = [...(task.subtasks || []), { id: generateId(), title: input.value, completed: false }];
    try {
      await updateDoc(doc(db, 'tasks', task.id), { subtasks: newSubtasks });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `tasks/${task.id}`);
    }
    input.value = '';
  };

  const updateSubtaskTitle = async (subtaskId: string, newTitle: string) => {
     if (!newTitle.trim()) return;
     const newSubtasks = (task.subtasks || []).map(st => st.id === subtaskId ? { ...st, title: newTitle } : st);
     try {
       await updateDoc(doc(db, 'tasks', task.id), { subtasks: newSubtasks });
     } catch (e) {
       handleFirestoreError(e, OperationType.UPDATE, `tasks/${task.id}`);
     }
  };

  const toggleSubtask = async (subtaskId: string) => {
    const newSubtasks = (task.subtasks || []).map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
    try {
      await updateDoc(doc(db, 'tasks', task.id), { subtasks: newSubtasks });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `tasks/${task.id}`);
    }
  };

  const removeSubtask = async (subtaskId: string) => {
     const newSubtasks = (task.subtasks || []).filter(st => st.id !== subtaskId);
     try {
       await updateDoc(doc(db, 'tasks', task.id), { subtasks: newSubtasks });
     } catch (e) {
       handleFirestoreError(e, OperationType.UPDATE, `tasks/${task.id}`);
     }
  }

  const isOverdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`group flex flex-col p-4 rounded-xl border transition-all ${
        task.completed ? 'bg-slate-900/20 border-transparent' : (isOverdue ? 'bg-red-900/10 border-red-500/50 hover:bg-red-900/20' : (selected ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-900/50 border-slate-800/50 hover:border-slate-700'))
      }`}
    >
      <div className="flex items-center gap-4">
        <input 
          type="checkbox"
          checked={selected}
          onChange={onSelect}
          className="w-4 h-4 rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900 bg-slate-800 cursor-pointer"
        />
        <button 
          onClick={onToggle}
          className={`w-6 h-6 rounded-md flex items-center justify-center border-2 shrink-0 transition-colors ${
            task.completed ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 hover:border-indigo-400'
          }`}
        >
          <AnimatePresence>
            {task.completed && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
        
        <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2 cursor-pointer">
            <p className={`font-medium truncate ${task.completed ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
              {task.title}
            </p>
            {task.priority && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold flex items-center gap-1
                ${task.priority === 'high' ? 'bg-red-900/20 text-red-400 border-red-800' : 
                  task.priority === 'medium' ? 'bg-orange-900/20 text-orange-400 border-orange-800' : 
                  'bg-indigo-900/20 text-indigo-400 border-indigo-800'}
              `}>
                {task.priority === 'high' && <Flame className="w-3 h-3" />}
                {task.priority === 'medium' && <Target className="w-3 h-3" />}
                {task.priority === 'low' && <Circle className="w-3 h-3" />}
                {task.priority}
              </span>
            )}
            {task.difficulty && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold bg-slate-800 text-slate-300 border-slate-700">
                {task.difficulty === 'easy' ? 'Easy 🟢' : task.difficulty === 'medium' ? 'Med 🟡' : 'Hard 🔴'}
              </span>
            )}
            {task.recurring && task.recurring !== 'none' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold bg-slate-800 text-slate-300 border-slate-700">
                🔁 {task.recurring}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-500 font-mono bg-slate-800/50 px-2 py-0.5 rounded cursor-pointer">
              {task.subject}
            </span>
            {task.dueDate && (
              <span className={`flex items-center gap-1 text-xs cursor-pointer ${isOverdue ? 'text-red-400 font-semibold' : 'text-slate-500'}`}>
                <Clock className="w-3.5 h-3.5" />
                {formatDate(task.dueDate)} {isOverdue && '(Overdue)'}
              </span>
            )}
            {task.reminderTime && !task.completed && (
              <span className="flex items-center gap-1 text-xs text-orange-400 cursor-pointer" title="Reminder set">
                <AlertCircle className="w-3.5 h-3.5" />
                {task.reminderTime}
              </span>
            )}
            {notes.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-indigo-400 ml-auto cursor-pointer">
                <FileText className="w-3.5 h-3.5" />
                {notes.length} note(s)
              </span>
            )}
          </div>
        </div>

        <button 
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 transition-all rounded-lg hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pl-10 mt-4 pt-4 border-t border-slate-800/50 space-y-4">
              <div>
                <textarea 
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-sm text-slate-300 placeholder-slate-600 focus:ring-1 focus:ring-indigo-500 resize-none"
                  placeholder="Add a description..."
                  rows={2}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  onBlur={saveDesc}
                />
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Reminder Settings</h4>
                <div className="flex items-center gap-2">
                   <input
                     type="time"
                     className="bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:ring-1 focus:ring-indigo-500 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.5]"
                     value={reminderTime}
                     onChange={(e) => setReminderTime(e.target.value)}
                     onBlur={saveReminder}
                   />
                   <span className="text-xs text-slate-500">(Set a time to get a browser notification)</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Subtasks</h4>
                <div className="space-y-2">
                  {(task.subtasks || []).map(st => (
                     <div key={st.id} className="flex items-center gap-2 group">
                        <button 
                          onClick={() => toggleSubtask(st.id)}
                          className={`w-4 h-4 rounded shrink-0 border flex items-center justify-center transition-colors ${st.completed ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}
                        >
                           <AnimatePresence>
                             {st.completed && (
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                   <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                </motion.div>
                             )}
                           </AnimatePresence>
                        </button>
                        <input 
                           type="text"
                           defaultValue={st.title}
                           onBlur={(e) => updateSubtaskTitle(st.id, e.target.value)}
                           onKeyDown={(e) => {
                             if (e.key === 'Enter') e.currentTarget.blur();
                           }}
                           className={`text-sm flex-1 bg-transparent border-none focus:ring-1 focus:ring-indigo-500/50 rounded px-1 -ml-1 transition-colors ${st.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`} 
                        />
                        <button onClick={() => removeSubtask(st.id)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                     </div>
                  ))}
                  <form onSubmit={handleAddSubtask} className="flex items-center gap-2 mt-2">
                    <Plus className="w-4 h-4 text-slate-500" />
                    <input name="subtask" type="text" placeholder="Add subtask..." className="bg-transparent border-none text-sm p-0 focus:ring-0 text-slate-300 w-full" />
                  </form>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                   <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Related Notes</h4>
                   <button onClick={() => navigate && navigate('notes')} className="text-xs text-indigo-400 flex items-center hover:text-indigo-300">
                      Go to Notes <ChevronRight className="w-3 h-3" />
                   </button>
                </div>
                {notes.length === 0 ? (
                  <p className="text-xs text-slate-500 italic mb-2">No notes linked to this task.</p>
                ) : (
                  <div className="space-y-1">
                  {notes.map(note => (
                    <div key={note.id} onClick={() => navigate && navigate('notes')} className="flex items-center gap-2 bg-slate-800/30 p-2 rounded cursor-pointer hover:bg-slate-800/50">
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-sm text-slate-300 truncate">{note.title || 'Untitled'}</span>
                    </div>
                  ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

