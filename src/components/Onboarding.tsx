import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  User, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Camera, 
  School, 
  Users,
  Star
} from 'lucide-react';
import { UserProfile } from '../types';
import { auth, db, signOut } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface Props {
  user: any;
  onComplete: (profile: UserProfile) => void;
}

const GRADES = [
  'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
  'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
  'High School', 'University', 'Other'
];

const AGE_GROUPS = [
  'Under 10', '10–13', '14–16', '17–18', '19+'
];

export default function Onboarding({ user, onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user.displayName || '');
  const [grade, setGrade] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [photo, setPhoto] = useState(user.photoURL || '');
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      console.error(e);
    }
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleFinish = async () => {
    setLoading(true);
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      displayName: name,
      photoBase64: photo,
      grade,
      ageGroup,
      provider: user.providerData?.[0]?.providerId || 'password',
      onboarded: true,
      xp: 0,
      level: 1,
      coins: 0,
      streak: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'users', user.email!), profile);
      onComplete(profile);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.email}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhoto(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const variants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Progress bar */}
        <div className="flex gap-2 mb-12">
          {[1,2,3,4,5].map(s => (
            <div 
              key={s} 
              className={`h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden relative`}
            >
              <div 
                className={`absolute inset-0 bg-indigo-500 transition-transform duration-500 origin-left 
                  ${step >= s ? 'scale-x-100' : 'scale-x-0'}`} 
              />
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" {...variants} className="space-y-8">
              <div className="text-center space-y-4">
                <div className="bg-indigo-600 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <User className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">What's your name?</h2>
                <p className="text-slate-400">Great to have you here! Let's start with your name.</p>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 px-6 text-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-center font-medium"
                    autoFocus
                  />
                </div>
                <button 
                  onClick={nextStep}
                  disabled={!name.trim()}
                  className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-500 transition disabled:opacity-50 flex items-center justify-center gap-2 text-lg shadow-lg shadow-indigo-500/20"
                >
                  Continue
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="text-center pt-4">
                   <button onClick={handleSignOut} className="text-xs text-slate-500 hover:text-indigo-400 transition underline underline-offset-4">
                     Sign out of {user.email}
                   </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" {...variants} className="space-y-8">
              <div className="text-center space-y-2">
                <div className="bg-emerald-500/10 w-12 h-12 rounded-xl flex items-center justify-center mx-auto text-emerald-400 mb-2">
                  <School className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Select your Grade</h2>
                <p className="text-slate-400">This helps us tailor your study experience.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                {GRADES.map(g => (
                  <button 
                    key={g}
                    onClick={() => { setGrade(g); nextStep(); }}
                    className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${grade === g ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'}`}
                  >
                    <span className="font-medium">{g}</span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${grade === g ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0'}`} />
                  </button>
                ))}
              </div>
              <button onClick={prevStep} className="text-slate-500 hover:text-white flex items-center gap-2 text-sm justify-center w-full transition">
                <ChevronLeft className="w-4 h-4" /> Go Back
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" {...variants} className="space-y-8">
              <div className="text-center space-y-2">
                <div className="bg-purple-500/10 w-12 h-12 rounded-xl flex items-center justify-center mx-auto text-purple-400 mb-2">
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Age Group (Optional)</h2>
                <p className="text-slate-400">We care about age-appropriate content.</p>
              </div>

              <div className="space-y-3">
                {AGE_GROUPS.map(a => (
                  <button 
                    key={a}
                    onClick={() => { setAgeGroup(a); nextStep(); }}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between group ${ageGroup === a ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'}`}
                  >
                    <span className="font-medium text-lg">{a}</span>
                    {ageGroup === a ? <Check className="w-6 h-6 text-white" /> : <ChevronRight className="w-5 h-5 opacity-0 group-hover:opacity-50 transition-opacity" />}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-4">
                <button onClick={nextStep} className="text-center text-indigo-400 font-medium text-sm hover:text-indigo-300 transition">Skip this step</button>
                <button onClick={prevStep} className="text-slate-500 hover:text-white flex items-center gap-2 text-sm justify-center w-full transition">
                  <ChevronLeft className="w-4 h-4" /> Go Back
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" {...variants} className="text-center space-y-8">
              <div className="space-y-2">
                <div className="bg-blue-500/10 w-12 h-12 rounded-xl flex items-center justify-center mx-auto text-blue-400 mb-2">
                  <Camera className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Profile Picture</h2>
                <p className="text-slate-400">Add a face to your study profile.</p>
              </div>
              
              <div className="relative w-40 h-40 mx-auto group">
                <div className="w-full h-full rounded-full bg-slate-900 border-4 border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center relative">
                  {photo ? (
                    <img src={photo} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Profile" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-800">
                      <User className="w-20 h-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white/70" />
                  </div>
                </div>
                <label className="absolute bottom-1 right-1 p-3 bg-indigo-600 rounded-full cursor-pointer hover:bg-indigo-500 shadow-lg ring-4 ring-slate-950 transition-all hover:scale-110">
                  <Camera className="w-6 h-6 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={nextStep}
                  className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 text-lg"
                >
                  {photo ? 'Lookin\' Good!' : 'Continue'}
                </button>
                <div className="flex flex-col gap-4">
                   {!photo && <button onClick={nextStep} className="text-slate-500 text-sm hover:text-slate-300 transition">Skip for now</button>}
                   <button onClick={prevStep} className="text-slate-500 hover:text-white flex items-center gap-2 text-sm justify-center w-full transition">
                     <ChevronLeft className="w-4 h-4" /> Go Back
                   </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="step5" {...variants} className="text-center space-y-10 py-6">
              <div className="relative">
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2"
                >
                  <Check className="w-12 h-12" />
                </motion.div>
                <div className="absolute top-0 right-1/4">
                  <Star className="w-6 h-6 text-yellow-400 animate-bounce" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h1 className="text-4xl font-bold text-white tracking-tight">You're all set!</h1>
                <p className="text-slate-400 text-lg px-4 leading-relaxed">
                  Welcome to StudySnap, <span className="text-indigo-400 font-bold">{name}</span>. 
                  Ready to conquer your academic goals?
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <button 
                  onClick={handleFinish}
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white font-bold py-5 rounded-2xl hover:bg-indigo-500 transition shadow-xl shadow-indigo-500/40 flex items-center justify-center gap-3 text-xl group"
                >
                  {loading ? 'Finalizing...' : "Enter StudySnap AI"}
                  {!loading && <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /> }
                </button>
                <button onClick={prevStep} className="text-slate-500 hover:text-white flex items-center gap-2 text-sm justify-center w-full transition">
                   <ChevronLeft className="w-4 h-4" /> Final Review
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ArrowRight(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
}
