import React, { useMemo, useState } from 'react';
import { Task, Note, ViewState, UserProfile } from '../types';
import { formatDate } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, Clock, BookOpen, AlertCircle, FileText, Zap, Trophy, TrendingUp, Target, Shield, Calendar as CalendarIcon, Star, Loader2, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import Markdown from 'react-markdown';

interface Props {
  tasks: Task[];
  notes: Note[];
  userProfile?: UserProfile | null;
  navigate: (view: ViewState) => void;
}

export default function DashboardView({ tasks, notes, userProfile, navigate }: Props) {
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const highPriorityPending = pendingTasks.filter(t => t.priority === 'high');
  const todayTasks = pendingTasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString());

  // Analytics Data
  const subjects = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      counts[t.subject] = (counts[t.subject] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [tasks]);

  const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b'];

  const weakSubject = subjects.length > 0 ? subjects[subjects.length - 1].name : 'None yet';
  const strongSubject = subjects.length > 0 ? subjects[0].name : 'None yet';

  const calculateProductivityScore = () => {
     if (tasks.length === 0) return 0;
     const completionRate = completedTasks / tasks.length;
     return Math.round(completionRate * 100);
  };

  const productivityScore = calculateProductivityScore();

  const [aiPlan, setAiPlan] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  const fetchStudyPlan = async () => {
    setLoadingPlan(true);
    setAiPlan(null);
    
    try {
      if (tasks.length === 0) {
        setAiPlan("You have no tasks! Enjoy your free time or add some tasks to get a study plan.");
        setLoadingPlan(false);
        return;
      }

      const response = await fetch('/api/ai/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tasks: tasks.filter(t => !t.completed), 
          userProfile,
          notesCount: notes.length
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch AI study plan');
      }

      const data = await response.json();
      setAiPlan(data.result);
    } catch (e: any) {
      console.error(e);
      setAiPlan(`### ⚠️ AI Error\n${e.message || 'Could not connect to AI services. Please ensure your Gemini API key is configured.'}`);
    } finally {
      setLoadingPlan(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome back! 👋</h2>
          <p className="text-slate-400">Ready to crush your study goals today?</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-2 rounded-2xl">
           <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 rounded-xl" title="Study Streak">
              <Zap className="w-5 h-5 text-indigo-400" />
              <span className="font-bold font-mono text-indigo-300">{userProfile?.streak || 0} Day Streak</span>
           </div>
           <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 rounded-xl" title="Current Level">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="font-bold font-mono text-yellow-500">Lvl {userProfile?.level || 1}</span>
           </div>
           <div className="flex items-center gap-2 px-3 py-1 bg-pink-500/10 rounded-xl" title="Study Coins">
              <Trophy className="w-5 h-5 text-pink-400" />
              <span className="font-bold font-mono text-pink-400">{userProfile?.coins || 0} Coins</span>
           </div>
        </div>
      </header>

      {/* Hero Analytics & Gamification Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 blur-3xl rounded-full"></div>
            <div className="relative z-10 flex flex-col h-full justify-between">
               <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1"><Target className="w-5 h-5 text-indigo-400"/> Current Rank</h3>
                  <p className="text-indigo-300 font-mono text-sm mb-6">Beginner → Scholar (Gain XP by studying!)</p>
               </div>
               
               <div>
                  <div className="flex justify-between text-sm mb-2 font-mono">
                     <span className="text-slate-300">XP Progress</span>
                     <span className="text-indigo-400">{userProfile?.xp || 0} / {(userProfile?.level || 1) * 1000} XP</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800">
                     <div className="bg-gradient-to-r from-indigo-600 to-pink-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, ((userProfile?.xp || 0) / ((userProfile?.level || 1) * 1000)) * 100)}%` }}></div>
                  </div>
               </div>
            </div>
         </div>
         
         <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-center items-center text-center">
            <h3 className="text-slate-400 text-sm uppercase tracking-wider mb-2 font-semibold">Productivity Score</h3>
            <div className="relative w-32 h-32 flex items-center justify-center mb-2">
               <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="8" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#6366f1" strokeWidth="8" strokeDasharray={`${productivityScore * 2.82} 282`} strokeLinecap="round" className="transition-all duration-1000" />
               </svg>
               <div className="absolute text-4xl font-black text-white">{productivityScore}</div>
            </div>
            <p className="text-xs text-slate-500">Based on task completion rate</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {/* Study Advice */}
         <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-indigo-400"/> Quick Insights</h3>
            <div className="space-y-4">
               <div className="bg-slate-950/50 p-4 rounded-2xl flex items-start gap-4">
                  <div className="bg-green-500/20 p-2 rounded-xl text-green-400 mt-1"><Shield className="w-5 h-5" /></div>
                  <div>
                     <p className="text-sm text-slate-400">Strongest Subject</p>
                     <p className="font-semibold text-slate-200">{strongSubject}</p>
                  </div>
               </div>
               <div className="bg-slate-950/50 p-4 rounded-2xl flex items-start gap-4">
                  <div className="bg-red-500/20 p-2 rounded-xl text-red-400 mt-1"><AlertCircle className="w-5 h-5" /></div>
                  <div>
                     <p className="text-sm text-slate-400">Needs Focus</p>
                     <p className="font-semibold text-slate-200">{weakSubject}</p>
                  </div>
               </div>
               <button onClick={fetchStudyPlan} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold transition-colors mt-2 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                  {loadingPlan ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 text-yellow-400" />}
                  "What to study today"
               </button>
            </div>
         </div>

         {/* Subject Chart */}
         <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col min-h-[250px]">
            <h3 className="text-lg font-bold mb-4">Subject Workload Analytics</h3>
               <div className="relative w-full h-[200px]">
              {subjects.length > 0 ? (
               <ResponsiveContainer width="99%" height="100%">
                  <PieChart>
                     <Pie data={subjects} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                        {subjects.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} cursor={false} />
                  </PieChart>
               </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">No task data available yet</div>
              )}
            </div>
            {subjects.length > 0 && (
               <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {subjects.map((subj, i) => (
                     <div key={subj.name} className="flex items-center gap-1.5 text-xs text-slate-400">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        {subj.name}
                     </div>
                  ))}
               </div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          onClick={() => navigate('tasks')}
          whileHover={{ y: -4 }}
          className="bg-slate-900 p-6 rounded-3xl border border-slate-800 cursor-pointer shadow-lg shadow-indigo-900/5 group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-slate-800 p-3 rounded-2xl">
              <CheckSquare className="w-6 h-6 text-indigo-400" />
            </div>
            <span className="text-3xl font-black text-slate-200">{pendingTasks.length}</span>
          </div>
          <h3 className="text-slate-100 font-semibold mb-1">To-Dos Remaining</h3>
          <p className="text-slate-500 text-sm group-hover:text-slate-400 transition-colors">You can do this!</p>
        </motion.div>

        <motion.div 
          onClick={() => navigate('tasks')}
          whileHover={{ y: -4 }}
          className="bg-slate-900 p-6 rounded-3xl border border-slate-800 cursor-pointer shadow-lg shadow-orange-900/5 group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <AlertCircle className="w-24 h-24 text-orange-500" />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="bg-slate-800 p-3 rounded-2xl">
              <Clock className="w-6 h-6 text-orange-400" />
            </div>
            <span className="text-3xl font-black text-slate-200">{highPriorityPending.length + todayTasks.length}</span>
          </div>
          <h3 className="text-slate-100 font-semibold mb-1 relative z-10">Urgent Focus</h3>
          <p className="text-slate-500 text-sm group-hover:text-slate-400 transition-colors relative z-10">High priority or due today</p>
        </motion.div>
      </div>

     {/* Study Tools Mini-Hub */}
     <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
         <h3 className="text-lg font-bold mb-4">Quick Study Tools</h3>
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Syllabus Splitter', 'Revision Planner', 'Subject Sorter', 'HW Organizer', 'Formula Gen', 'Checklist Fill', 'Countdown', 'Streak Rescue'].map(tool => (
               <div key={tool} className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center cursor-pointer hover:bg-slate-800 hover:border-indigo-500/30 transition-all group">
                  <span className="text-sm font-medium text-slate-400 group-hover:text-slate-200">{tool}</span>
               </div>
            ))}
         </div>
     </div>

     {/* AI Study Plan Modal */}
     <AnimatePresence>
       {aiPlan && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden relative"
            >
               <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 shrink-0">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-indigo-400">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Your Daily Intelligence Plan
                  </h3>
                  <button onClick={() => setAiPlan(null)} className="text-slate-400 hover:text-white p-2 transition-colors">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 md:p-8 markdown-preview text-slate-200">
                  <Markdown>{String(aiPlan)}</Markdown>
               </div>
               <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex justify-end">
                  <button 
                     onClick={() => setAiPlan(null)}
                     className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-xl transition-colors font-semibold"
                  >
                     Got it, let's go! 🚀
                  </button>
               </div>
            </motion.div>
         </div>
       )}
     </AnimatePresence>
    </div>
  );
}
