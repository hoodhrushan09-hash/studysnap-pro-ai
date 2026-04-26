import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  FileText, 
  Timer,
  Zap,
  Calendar,
  LogOut,
  User as UserIcon,
  Upload,
  Search
} from 'lucide-react';
import { Task, Note, ViewState, UserProfile } from './types';
import DashboardView from './components/DashboardView';
import TasksView from './components/TasksView';
import NotesView from './components/NotesView';
import FocusView from './components/FocusView';
import CalendarView from './components/CalendarView';
import SearchView from './components/SearchView';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import { auth, db, signOut } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, setDoc, getDoc, getDocs, getDocFromServer } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestoreUtils';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        setProfileLoading(true);
        try {
          if (!user.email) throw new Error("Email required for account");
          const docRef = doc(db, 'users', user.email);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
             const data = docSnap.data() as UserProfile;
             setUserProfile(data);
             if (data.photoBase64) setProfilePicture(data.photoBase64);
          } else {
             setUserProfile(null);
          }
        } catch (e) {
          console.error("Error fetching profile", e);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setTasks([]);
        setNotes([]);
        setUserProfile(null);
        setProfilePicture(null);
        setProfileLoading(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', user.email));
    const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
      const t: Task[] = [];
      snapshot.forEach(doc => {
        t.push({ id: doc.id, ...doc.data() } as Task);
      });
      setTasks(t.sort((a,b) => b.createdAt - a.createdAt));
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, 'tasks');
    });

    const notesQuery = query(collection(db, 'notes'), where('userId', '==', user.email));
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const n: Note[] = [];
      snapshot.forEach(doc => {
        n.push({ id: doc.id, ...doc.data() } as Note);
      });
      setNotes(n.sort((a,b) => b.updatedAt - a.updatedAt));
    }, (error) => {
       handleFirestoreError(error, OperationType.GET, 'notes');
    });

    const userRef = doc(db, 'users', user.email!);
    const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setUserProfile(data);
        if (data.photoBase64) {
          setProfilePicture(data.photoBase64);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.email}`);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeNotes();
      unsubscribeUser();
    }
  }, [user]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
       const now = new Date();
       const currentHours = now.getHours().toString().padStart(2, '0');
       const currentMinutes = now.getMinutes().toString().padStart(2, '0');
       const currentTimeStr = `${currentHours}:${currentMinutes}`;
       
       tasks.forEach(task => {
          if (!task.completed && task.reminderTime === currentTimeStr) {
             const notifiedKey = `notified_${task.id}_${now.toDateString()}`;
             if (!localStorage.getItem(notifiedKey)) {
               if ('Notification' in window && Notification.permission === 'granted') {
                 new Notification('StudySnap Reminder', { body: `Time to start: ${task.title}` });
               } else {
                 console.log(`Reminder: ${task.title}`);
               }
               localStorage.setItem(notifiedKey, 'true');
             }
          }
       });
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [tasks]);

  const awardGamification = async (type: 'task_completed' | 'note_created') => {
    if (!auth.currentUser || !userProfile) return;
    let xpGain = type === 'task_completed' ? 50 : 20;
    let coinsGain = type === 'task_completed' ? 10 : 5;
    
    let newXp = (userProfile.xp || 0) + xpGain;
    let newLevel = userProfile.level || 1;
    let newCoins = (userProfile.coins || 0) + coinsGain;
    
    if (newXp >= newLevel * 1000) {
      newXp = newXp - (newLevel * 1000);
      newLevel++;
      // Celebrate level up (omitted for brevity)
    }

    try {
      await setDoc(doc(db, 'users', auth.currentUser.email!), {
         xp: newXp,
         level: newLevel,
         coins: newCoins,
         updatedAt: Date.now()
      }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    { id: 'search', label: 'Search', icon: Search },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'focus', label: 'Focus', icon: Timer },
  ] as const;

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        setProfilePicture(base64);
        try {
          await setDoc(doc(db, 'users', user.email!), { photoBase64: base64, updatedAt: Date.now() }, { merge: true });
        } catch (err) {
          console.error(err);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  if (authLoading || (user && profileLoading)) {
     return <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-indigo-400">
        <div className="flex flex-col items-center gap-4">
          <Zap className="w-10 h-10 animate-pulse text-indigo-500" />
          <p className="font-medium animate-pulse">Initializing StudySnap AI...</p>
        </div>
     </div>;
  }

  if (!user) {
    return <Auth onSuccess={() => {}} />;
  }

  if (!userProfile?.onboarded) {
    return <Onboarding user={user} onComplete={(profile) => setUserProfile(profile)} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-200 selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 p-6">
        <div className="flex items-center gap-3 mb-10 text-white">
          <div className="bg-indigo-600 p-2 rounded-xl">
            <Zap className="w-6 h-6 fill-none" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">StudySnap <span className="text-indigo-400">AI</span></h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                  ${isActive 
                    ? 'bg-slate-900 text-white border border-slate-700' 
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 w-full relative">
           <button 
             onClick={() => setShowProfile(!showProfile)} 
             className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition"
           >
             {profilePicture ? (
               <img src={profilePicture} className="w-10 h-10 rounded-full object-cover border border-slate-700" alt="Profile" />
             ) : (
               <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                  <UserIcon className="w-5 h-5 text-slate-400" />
               </div>
             )}
             <div className="text-left flex-1 min-w-0">
               <p className="text-sm font-semibold text-slate-200 truncate">{user.displayName || 'User'}</p>
               <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
             </div>
           </button>
           
           <AnimatePresence>
             {showProfile && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="absolute bottom-full left-0 mb-2 w-full bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-xl"
               >
                 <label className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg cursor-pointer transition">
                   <Upload className="w-4 h-4" />
                   Upload Picture
                   <input type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} />
                 </label>
                 <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition mt-1">
                   <LogOut className="w-4 h-4" />
                   Sign Out
                 </button>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col h-full">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 text-white">
            <Zap className="w-5 h-5 text-indigo-400" />
            <h1 className="text-lg font-bold tracking-tight">StudySnap</h1>
          </div>
          <div className="relative">
            <button 
               onClick={() => setShowProfile(!showProfile)}
               className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden"
            >
               {profilePicture ? (
                 <img src={profilePicture} className="w-full h-full object-cover" alt="Profile" />
               ) : (
                 <UserIcon className="w-4 h-4 text-slate-400" />
               )}
            </button>
            <AnimatePresence>
             {showProfile && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-xl z-50 flex flex-col"
               >
                 <div className="px-3 py-2 border-b border-slate-800 mb-1">
                   <p className="text-sm font-semibold text-slate-200 truncate">{user.displayName || 'User'}</p>
                   <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                 </div>
                 <label className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg cursor-pointer transition">
                   <Upload className="w-4 h-4" />
                   Upload Picture
                   <input type="file" accept="image/*" className="hidden" onChange={handleUploadPhoto} />
                 </label>
                 <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition">
                   <LogOut className="w-4 h-4" />
                   Sign Out
                 </button>
               </motion.div>
             )}
           </AnimatePresence>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-24 md:pb-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentView === 'dashboard' && <DashboardView tasks={tasks} notes={notes} userProfile={userProfile} navigate={setCurrentView} />}
              {currentView === 'search' && <SearchView tasks={tasks} notes={notes} navigate={setCurrentView} />}
              {currentView === 'calendar' && <CalendarView tasks={tasks} />}
              {currentView === 'tasks' && <TasksView tasks={tasks} setTasks={setTasks} notes={notes} userProfile={userProfile} navigate={setCurrentView} />}
              {currentView === 'notes' && <NotesView notes={notes} setNotes={setNotes} tasks={tasks} />}
              {currentView === 'focus' && <FocusView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-slate-900 border-t border-slate-800 z-50 px-6 pb-6 pt-4 flex items-center justify-between pb-safe">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex flex-col items-center gap-1 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-indigo-500/10' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      {/* Universal Floating Action Button */}
      {currentView !== 'tasks' && (
        <button 
          onClick={() => setCurrentView('tasks')}
          className="fixed bottom-24 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-40 group pb-[env(safe-area-inset-bottom)]"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          <span className="absolute right-full mr-4 bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Quick Task</span>
        </button>
      )}
    </div>
  );
}
