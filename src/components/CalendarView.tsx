import React, { useState } from 'react';
import { Task } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { formatDate } from '../utils';

interface Props {
  tasks: Task[];
}

export default function CalendarView({ tasks }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const getTasksForDay = (day: number) => {
    if (!day) return [];
    return tasks.filter(t => {
      if (!t.dueDate) return false;
      const tDate = new Date(t.dueDate);
      return tDate.getDate() === day && tDate.getMonth() === month && tDate.getFullYear() === year;
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Calendar</h2>
          <p className="text-slate-400 mt-1">Plan your study schedule.</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2">
          <button onClick={prevMonth} className="p-1 hover:text-indigo-400 text-slate-400 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-semibold w-32 text-center text-white">
            {monthNames[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1 hover:text-indigo-400 text-slate-400 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Days Header */}
        <div className="grid grid-cols-7 bg-slate-900 border-b border-slate-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-[120px] bg-slate-900/30 gap-[1px]">
          {days.map((day, i) => {
            const dayTasks = day ? getTasksForDay(day) : [];
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            
            return (
              <div 
                key={i} 
                className={`p-2 bg-slate-950 transition-colors ${day ? 'hover:bg-slate-900/80 cursor-default' : 'opacity-50'}`}
              >
                {day && (
                  <div className="flex flex-col h-full">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold mb-2
                      ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-300'}
                    `}>
                      {day}
                    </span>
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {dayTasks.map(task => (
                        <div 
                          key={task.id} 
                          className={`text-[10px] px-2 py-1 rounded border leading-tight truncate
                            ${task.completed ? 'bg-slate-800/50 border-slate-700/50 text-slate-500 line-through' : 
                            (task.priority === 'high' ? 'bg-red-900/20 border-red-800/50 text-red-300' :
                             task.priority === 'medium' ? 'bg-orange-900/20 border-orange-800/50 text-orange-300' :
                             'bg-indigo-900/20 border-indigo-800/50 text-indigo-300')}
                          `}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
