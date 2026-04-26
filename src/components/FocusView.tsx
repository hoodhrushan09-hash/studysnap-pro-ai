import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Pause, RotateCcw, BrainCircuit, Coffee } from 'lucide-react';

const TIPS = [
  "Active recall is 50% more effective than passive reading. Test yourself!",
  "Take a 5-minute break every 25 minutes to avoid burnout.",
  "Explain what you just learned to an imaginary friend. If you can't, review it again.",
  "Drink water. A hydrated brain processes information faster.",
  "Focus on one task at a time. Multitasking is a myth."
];

export default function FocusView() {
  const [focusDuration, setFocusDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [activeTip, setActiveTip] = useState(TIPS[0]);
  const [sessionGoal, setSessionGoal] = useState('');
  const [isDistractionFree, setIsDistractionFree] = useState(false);

  useEffect(() => {
    setActiveTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
  }, []);

  useEffect(() => {
    let interval: number | undefined;
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (mode === 'focus') {
        setMode('break');
        setTimeLeft(breakDuration * 60);
      } else {
        setMode('focus');
        setTimeLeft(focusDuration * 60);
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode, focusDuration, breakDuration]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? focusDuration * 60 : breakDuration * 60);
  };

  const switchMode = (newMode: 'focus' | 'break') => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(newMode === 'focus' ? focusDuration * 60 : breakDuration * 60);
  };

  useEffect(() => {
    if (!isActive) {
      setTimeLeft(mode === 'focus' ? focusDuration * 60 : breakDuration * 60);
    }
  }, [focusDuration, breakDuration, mode]);

  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');

  const totalTime = mode === 'focus' ? focusDuration * 60 : breakDuration * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  if (isDistractionFree) {
    return (
      <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center p-8">
        <button onClick={() => setIsDistractionFree(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white px-4 py-2 border border-slate-800 rounded-xl">Exit Deep Focus</button>
        {sessionGoal && <h2 className="text-2xl md:text-4xl text-slate-400 mb-8 font-serif italic text-center max-w-2xl">Goal: {sessionGoal}</h2>}
        <div className="font-mono text-8xl md:text-[12rem] font-bold text-white mb-12 tabular-nums tracking-tighter">
          {minutes}:{seconds}
        </div>
        <div className="flex gap-6">
            <button 
              onClick={toggleTimer}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-transform hover:scale-105 ${isActive ? 'bg-slate-800 border border-slate-700 text-white' : (mode === 'focus' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white')}`}
            >
              {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-2" />}
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-12 pb-12">
      <header className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Focus Chamber 🧠</h2>
        <p className="text-slate-400 mt-2">Block out distractions and deep work.</p>
      </header>

      {/* Timer Widget */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 md:p-12 shadow-2xl relative overflow-hidden flex flex-col items-center">
        
        {/* Subtle animated background glow */}
        <div className={`absolute inset-0 opacity-20 transition-colors duration-1000 ${isActive ? (mode === 'focus' ? 'bg-indigo-500' : 'bg-emerald-500') : 'bg-transparent'}`} />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex bg-slate-950 rounded-full p-1 mb-10 border border-slate-800">
            <button 
              onClick={() => switchMode('focus')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${mode === 'focus' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Focus
            </button>
            <button 
              onClick={() => switchMode('break')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${mode === 'break' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Break
            </button>
          </div>

          {!isActive && mode === 'focus' && (
             <div className="mb-8 w-full max-w-xs flex gap-2">
                 <input 
                   type="text" 
                   className="bg-transparent border border-slate-800 rounded-lg w-full px-4 py-2 text-center focus:ring-1 focus:ring-indigo-500 text-slate-200 placeholder-slate-600"
                   placeholder="What's your goal for this session?"
                   value={sessionGoal}
                   onChange={e => setSessionGoal(e.target.value)}
                 />
             </div>
          )}
          {isActive && sessionGoal && (
             <div className="mb-8 max-w-sm text-center">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-1">Current Goal</p>
                <p className="text-lg text-indigo-300 font-serif italic">{sessionGoal}</p>
             </div>
          )}

          <div className="relative mb-12 cursor-pointer group" onClick={() => setIsDistractionFree(true)} title="Enter Distraction-Free Mode">
            {/* Circular Progress SVG */}
            <svg className="w-64 h-64 md:w-80 md:h-80 transform -rotate-90">
              <circle
                cx="50%" cy="50%" r="48%"
                className="stroke-slate-800 fill-transparent"
                strokeWidth="4"
              />
              <circle
                cx="50%" cy="50%" r="48%"
                className={`fill-transparent transition-all duration-1000 ease-linear ${mode === 'focus' ? 'stroke-indigo-500' : 'stroke-emerald-500'}`}
                strokeWidth="4"
                strokeDasharray="300%"
                strokeDashoffset={`${300 - (300 * progress) / 100}%`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-7xl md:text-8xl font-bold tracking-tight">
                {minutes}:{seconds}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTimer}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-transform hover:scale-105 ${isActive ? 'bg-slate-800 border-2 border-slate-700 text-white' : (mode === 'focus' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white')}`}
            >
              {isActive ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
            </button>
            <button 
              onClick={resetTimer}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-800 border-2 border-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

          {!isActive && (
            <div className="mt-8 flex gap-4 bg-slate-950 p-2 rounded-xl border border-slate-800 text-sm">
                <label className="flex items-center gap-2 px-2 text-slate-400">
                  Focus:
                   <select 
                     className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono"
                     value={focusDuration}
                     onChange={(e) => setFocusDuration(Number(e.target.value))}
                   >
                     <option value="15" className="bg-slate-900">15m</option>
                     <option value="25" className="bg-slate-900">25m</option>
                     <option value="45" className="bg-slate-900">45m</option>
                     <option value="60" className="bg-slate-900">60m</option>
                     <option value="90" className="bg-slate-900">90m</option>
                   </select>
                </label>
                <label className="flex items-center gap-2 px-2 text-slate-400 border-l border-slate-800 pl-4">
                  Break:
                   <select 
                     className="bg-transparent border-none p-0 focus:ring-0 text-white font-mono"
                     value={breakDuration}
                     onChange={(e) => setBreakDuration(Number(e.target.value))}
                   >
                     <option value="5" className="bg-slate-900">5m</option>
                     <option value="10" className="bg-slate-900">10m</option>
                     <option value="15" className="bg-slate-900">15m</option>
                   </select>
                </label>
            </div>
          )}
        </div>
      </div>

      {/* AI Suggestion / Tip */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 flex items-start gap-4"
      >
        <div className="bg-indigo-500/10 p-3 rounded-xl shrink-0">
          <BrainCircuit className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-indigo-400 mb-1">AI Study Tip</h4>
          <p className="text-slate-300 leading-relaxed">{activeTip}</p>
        </div>
      </motion.div>
    </div>
  );
}
