/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Target, 
  Trophy, 
  TrendingUp, 
  Zap, 
  Download, 
  Upload, 
  Trash2, 
  Edit2, 
  Copy,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  MessageSquareQuote,
  Flame,
  Sun,
  Moon,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import confetti from 'canvas-confetti';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Priority, Task, StrategicGoal, Badge, AppData } from './types';
import { DAYS_OF_WEEK, INITIAL_BADGES, AI_MESSAGES } from './constants';

// --- Components ---

function BadgeItem({ badge }: { badge: Badge }) {
  const Icon = ({ ShieldCheck, Zap, Trophy }[badge.icon] || ShieldCheck) as any;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl border ${badge.unlockedAt ? 'border-electric-lime/40 bg-electric-lime/5' : 'border-main/5 bg-surface opacity-50'}`}>
      <div className={`p-2 rounded-xl ${badge.unlockedAt ? 'bg-electric-lime text-void' : 'bg-surface text-muted'}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-sm font-bold leading-none text-main">{badge.name}</p>
        <p className="text-[10px] text-muted mt-1">{badge.condition}</p>
      </div>
    </div>
  );
}

const QUARTERS = ['Q1 (Jan-Mar)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dec)'];

export default function App() {
  // --- State ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<StrategicGoal[]>([]);
  const [badges, setBadges] = useState<Badge[]>(INITIAL_BADGES);
  const [streak, setStreak] = useState(0);
  
  // Navigation State
  const [activeYear, setActiveYear] = useState(new Date().getFullYear());
  const [activeQuarter, setActiveQuarter] = useState(Math.floor(new Date().getMonth() / 3));
  const [activeWeek, setActiveWeek] = useState(0);
  const [activeDay, setActiveDay] = useState(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  
  const [isEditingTask, setIsEditingTask] = useState<string | null>(null);
  const [taskInput, setTaskInput] = useState('');
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isDataPanelOpen, setIsDataPanelOpen] = useState(false);
  const [storageStatus, setStorageStatus] = useState<'persistent' | 'temporary' | 'unknown'>('unknown');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- Refs ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Storage & Initialization ---
  useEffect(() => {
    async function initData() {
      // 1. Storage Persistence Request (Browser-side)
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().then(persistent => {
          setStorageStatus(persistent ? 'persistent' : 'temporary');
        });
      }

      // 2. Fetch from Server (Primary Source)
      try {
        const response = await fetch('/api/data');
        if (response.ok) {
          const remoteData = await response.json();
          if (remoteData.tasks) {
            setTasks(remoteData.tasks);
            setGoals(remoteData.goals || []);
            setBadges(remoteData.badges || INITIAL_BADGES);
            setStreak(remoteData.streak || 0);
            if (remoteData.isDarkMode !== undefined) setIsDarkMode(remoteData.isDarkMode);
            if (remoteData.currentYear) setActiveYear(remoteData.currentYear);
            if (remoteData.currentQuarter !== undefined) setActiveQuarter(remoteData.currentQuarter);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Server storage unavailable, falling back to local storage', err);
      }

      // 3. Fallback to LocalStorage
      const saved = localStorage.getItem('vision12_data');
      if (saved) {
        try {
          const parsed: AppData & { isDarkMode?: boolean } = JSON.parse(saved);
          setTasks(parsed.tasks || []);
          setGoals(parsed.goals || []);
          setBadges(parsed.badges || INITIAL_BADGES);
          setStreak(parsed.streak || 0);
          if (parsed.isDarkMode !== undefined) setIsDarkMode(parsed.isDarkMode);
          if (parsed.currentYear) setActiveYear(parsed.currentYear);
          if (parsed.currentQuarter !== undefined) setActiveQuarter(parsed.currentQuarter);
        } catch (e) {
          console.error('Failed to load local data', e);
        }
      }
      setIsLoading(false);
    }

    initData();
  }, []);

  // Sync to Server and LocalStorage
  useEffect(() => {
    if (isLoading) return; // Don't sync while data is being loaded for the first time

    const data: AppData & { isDarkMode: boolean } = {
      tasks,
      goals,
      badges,
      streak,
      lastCompletedDate: new Date().toISOString(),
      isDarkMode,
      currentYear: activeYear,
      currentQuarter: activeQuarter
    };
    
    // Save locally
    localStorage.setItem('vision12_data', JSON.stringify(data));
    
    // Debounced save to server
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await fetch('/api/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } catch (err) {
        console.error('Auto-save to server failed', err);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // 1-second debounce

    if (isDarkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [tasks, goals, badges, streak, isDarkMode, activeYear, activeQuarter, isLoading]);

  // --- Computed Stats ---
  const dailyTasks = useMemo(() => 
    tasks.filter(t => t.yearIndex === activeYear && t.quarterIndex === activeQuarter && t.weekIndex === activeWeek && t.dayIndex === activeDay),
  [tasks, activeYear, activeQuarter, activeWeek, activeDay]);

  const completionRate = useMemo(() => {
    if (dailyTasks.length === 0) return 0;
    const completed = dailyTasks.filter(t => t.completed).length;
    return Math.round((completed / dailyTasks.length) * 100);
  }, [dailyTasks]);

  const quarterProgress = useMemo(() => {
    const qTasks = tasks.filter(t => t.yearIndex === activeYear && t.quarterIndex === activeQuarter);
    if (qTasks.length === 0) return 0;
    return Math.round((qTasks.filter(t => t.completed).length / qTasks.length) * 100);
  }, [tasks, activeYear, activeQuarter]);

  const yearlyQuartersStats = useMemo(() => {
    return [0, 1, 2, 3].map(qIdx => {
      const qTasks = tasks.filter(t => t.yearIndex === activeYear && t.quarterIndex === qIdx);
      const total = qTasks.length;
      const done = qTasks.filter(t => t.completed).length;
      return {
        label: `Q${qIdx + 1}`,
        progress: total === 0 ? 0 : Math.round((done / total) * 100),
        taskCount: total
      };
    });
  }, [tasks, activeYear]);

  const aiMessage = useMemo(() => {
    const category = completionRate < 35 ? 'low' : completionRate > 80 ? 'high' : 'medium';
    const messages = AI_MESSAGES[category];
    return messages[Math.floor(Math.random() * messages.length)];
  }, [completionRate]);

  const weeklyStats = useMemo(() => {
    return DAYS_OF_WEEK.map((day, idx) => {
      const dayTasks = tasks.filter(t => t.yearIndex === activeYear && t.quarterIndex === activeQuarter && t.weekIndex === activeWeek && t.dayIndex === idx);
      const completed = dayTasks.filter(t => t.completed).length;
      return {
        name: day,
        rate: dayTasks.length === 0 ? 0 : Math.round((completed / dayTasks.length) * 100)
      };
    });
  }, [tasks, activeYear, activeQuarter, activeWeek]);

  // --- Handlers ---
  const addTask = () => {
    if (!taskInput.trim()) return;
    
    if (isEditingTask) {
      setTasks(tasks.map(t => t.id === isEditingTask ? { ...t, title: taskInput, priority: taskPriority } : t));
      setIsEditingTask(null);
    } else {
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: taskInput,
        completed: false,
        priority: taskPriority,
        dayIndex: activeDay,
        weekIndex: activeWeek,
        quarterIndex: activeQuarter,
        yearIndex: activeYear
      };
      setTasks([...tasks, newTask]);
      
      // Unlock "Quick Starter" badge
      if (badges.find(b => b.id === 'starter' && !b.unlockedAt)) {
        unlockBadge('starter');
      }
    }
    setTaskInput('');
    setTaskPriority('medium');
  };

  const toggleTask = (id: string) => {
    const newTasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTasks(newTasks);

    const task = newTasks.find(t => t.id === id);
    if (task?.completed) {
      // Check if all today's tasks are done
      const todayTasks = newTasks.filter(t => t.yearIndex === activeYear && t.quarterIndex === activeQuarter && t.weekIndex === activeWeek && t.dayIndex === activeDay);
      if (todayTasks.every(t => t.completed)) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#D9F967', '#ffffff', '#27272A']
        });
        checkStreak();
      }
    }
  };

  const checkStreak = () => {
    setStreak(s => s + 1);
    if (streak + 1 >= 5) {
      unlockBadge('disciplined');
    }
  };

  const unlockBadge = (id: string) => {
    setBadges(prev => prev.map(b => b.id === id ? { ...b, unlockedAt: new Date().toISOString() } : b));
  };

  const duplicateTask = (task: Task) => {
    const duplicates: Task[] = DAYS_OF_WEEK.map((_, idx) => ({
      ...task,
      id: crypto.randomUUID(),
      dayIndex: idx,
      completed: false
    })).filter(t => t.dayIndex !== activeDay);
    
    setTasks([...tasks, ...duplicates]);
  };

  const exportData = () => {
    const data = JSON.stringify({ tasks, goals, badges, streak, activeYear, activeQuarter });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vision12-backup-${activeYear}-Q${activeQuarter + 1}.json`;
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setTasks(parsed.tasks || []);
        setGoals(parsed.goals || []);
        setBadges(parsed.badges || INITIAL_BADGES);
        setStreak(parsed.streak || 0);
        if (parsed.activeYear) setActiveYear(parsed.activeYear);
        if (parsed.activeQuarter !== undefined) setActiveQuarter(parsed.activeQuarter);
      } catch (err) {
        alert('Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'medium': return 'text-electric-lime bg-electric-lime/10 border-electric-lime/20';
      case 'low': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-7xl mx-auto selection:bg-electric-lime selection:text-void transition-colors duration-300">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-electric-lime rounded-full flex items-center justify-center text-void shadow-[0_0_30px_rgba(217,249,103,0.3)]">
            <Zap size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none text-main">VISION.12</h1>
            <p className="text-muted font-medium mt-1 uppercase tracking-widest">{activeYear} • QUARTER {activeQuarter + 1} STRATEGY</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-surface p-2 rounded-3xl md:rounded-full border border-border-dim">
          <div className="flex items-center px-4 py-2 bg-main/5 rounded-full border border-border-dim">
             <button onClick={() => setActiveYear(y => y - 1)} className="p-1 hover:text-electric-lime transition-colors"><ChevronLeft size={16} /></button>
             <span className="px-3 font-black italic text-main">{activeYear}</span>
             <button onClick={() => setActiveYear(y => y + 1)} className="p-1 hover:text-electric-lime transition-colors"><ChevronRight size={16} /></button>
          </div>

          <div className="flex gap-1 bg-main/5 p-1 rounded-full border border-border-dim">
            {[0, 1, 2, 3].map(qIdx => (
              <button 
                key={qIdx}
                onClick={() => setActiveQuarter(qIdx)}
                className={`px-3 py-1 rounded-full text-[10px] font-black transition-all ${activeQuarter === qIdx ? 'bg-electric-lime text-void shadow-lg' : 'text-muted hover:text-main'}`}
              >
                Q{qIdx + 1}
              </button>
            ))}
          </div>

          <div className="h-6 w-[1px] bg-border-dim mx-1 hidden md:block" />
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="p-3 hover:bg-main/10 rounded-full transition-colors text-muted hover:text-main"
            title={isDarkMode ? "Light Mode" : "Dark Mode"}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <div className="h-6 w-[1px] bg-border-dim mx-1" />
          
          <div className="relative">
            <button 
              onClick={() => setIsDataPanelOpen(!isDataPanelOpen)} 
              className={`p-3 rounded-full transition-all ${isDataPanelOpen ? 'bg-electric-lime text-void shadow-lg' : 'hover:bg-main/10 text-muted hover:text-main'}`}
              title="Data & Storage"
            >
              <ShieldCheck size={20} />
            </button>
            
            <AnimatePresence>
              {isDataPanelOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-72 glass-card p-6 z-50 shadow-2xl border border-border-dim"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black italic text-main uppercase">System Data Hub</h4>
                      {isSaving && (
                        <motion.div 
                          animate={{ opacity: [1, 0.4, 1] }} 
                          transition={{ repeat: Infinity, duration: 1 }}
                          className="w-2 h-2 bg-electric-lime rounded-full"
                        />
                      )}
                    </div>
                    <button onClick={() => setIsDataPanelOpen(false)} className="text-muted hover:text-main"><Plus className="rotate-45" size={16} /></button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-main/5 rounded-2xl border border-border-dim">
                      <div className={`p-2 rounded-xl ${storageStatus === 'persistent' ? 'bg-electric-lime/20 text-electric-lime' : 'bg-red-500/20 text-red-500'}`}>
                        <Zap size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-main">Storage Integrity</p>
                        <p className="text-[9px] text-muted font-bold">{storageStatus === 'persistent' ? 'PERSISTENT (SAFE)' : 'TEMP (MAY BE CLEARED)'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={exportData} className="flex flex-col items-center gap-2 p-3 bg-surface border border-border-dim rounded-2xl hover:border-electric-lime/40 transition-all">
                        <Download size={16} className="text-muted" />
                        <span className="text-[9px] font-bold uppercase text-main">Backup</span>
                      </button>
                      <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 p-3 bg-surface border border-border-dim rounded-2xl hover:border-electric-lime/40 transition-all">
                        <Upload size={16} className="text-muted" />
                        <span className="text-[9px] font-bold uppercase text-main">Restore</span>
                        <input type="file" ref={fileInputRef} onChange={importData} className="hidden" accept=".json" />
                      </button>
                    </div>

                    <div className="pt-4 border-t border-border-dim">
                      <button 
                        onClick={async () => {
                          if (confirm('CRITICAL: This will permanently wipe all local and server data for VISION.12. This cannot be undone. Proceed?')) {
                            localStorage.removeItem('vision12_data');
                            try {
                              await fetch('/api/data', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({})
                              });
                            } catch (e) {
                              console.error('Failed to clear server data', e);
                            }
                            window.location.reload();
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-void rounded-2xl border border-red-500/20 transition-all group"
                      >
                        <Trash2 size={16} />
                        <span className="text-[9px] font-black uppercase">Wipe All Data</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="h-6 w-[1px] bg-border-dim mx-1 hidden md:block" />
          
          <div className="flex items-center gap-2 px-4 py-2 bg-electric-lime/10 text-electric-lime rounded-full border border-electric-lime/20">
            <Flame size={18} fill="currentColor" />
            <span className="font-bold whitespace-nowrap">{streak} DAY STREAK</span>
          </div>
        </div>
      </header>

      {/* Main Bento Grid */}
      <div className="bento-grid">
        
        {/* Progress Card */}
        <div className="col-span-12 md:col-span-5 glass-card p-8 flex flex-col justify-between group">
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="flex flex-col">
                <span className="text-xs font-bold tracking-widest text-muted uppercase">Execution Velocity</span>
                <span className="text-[10px] text-electric-lime font-bold mt-1 uppercase tracking-tighter">Day Progress</span>
              </div>
              <div className="p-2 bg-surface border border-border-dim rounded-xl">
                <TrendingUp size={20} className="text-electric-lime" />
              </div>
            </div>
            <h2 className="text-6xl font-black italic mb-2 text-main">{completionRate}%</h2>
            <div className="h-3 w-full bg-surface rounded-full overflow-hidden border border-border-dim">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                className="h-full bg-electric-lime shadow-[0_0_20px_rgba(217,249,103,0.3)]"
              />
            </div>
            
            <div className="mt-8 flex justify-between items-end border-t border-border-dim pt-6">
              <div>
                <span className="text-[10px] font-bold text-muted uppercase block mb-1">Quarterly Trajectory</span>
                <span className="text-2xl font-black italic text-main">{quarterProgress}%</span>
              </div>
              <div className="w-24 h-2 bg-surface rounded-full overflow-hidden border border-border-dim">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${quarterProgress}%` }}
                  className="h-full bg-white/20"
                />
              </div>
            </div>

            <p className="text-sm text-muted mt-6 leading-relaxed">
              Achieving consistency in {QUARTERS[activeQuarter]}. You have completed {dailyTasks.filter(t => t.completed).length}/{dailyTasks.length} missions today.
            </p>
          </div>
          
          <div className="mt-10 p-5 bg-electric-lime text-void rounded-[32px] flex items-center gap-4">
             <div className="w-10 h-10 bg-void/10 rounded-full flex items-center justify-center">
                <MessageSquareQuote size={20} />
             </div>
             <div>
               <p className="text-xs font-bold uppercase opacity-60">AI Strategy Core</p>
               <p className="text-sm font-bold leading-tight">{aiMessage}</p>
             </div>
          </div>
        </div>

        {/* Global Year Overview Card */}
        <div className="col-span-12 md:col-span-7 glass-card p-8 flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-bold italic uppercase tracking-tight flex items-center gap-2 text-main">
              <Layers size={22} className="text-electric-lime" />
              Strategic Year Timeline
            </h3>
            <span className="text-[10px] font-bold text-muted uppercase bg-main/5 px-3 py-1 rounded-full border border-border-dim">{activeYear} PERFORMANCE HUB</span>
          </div>

          <div className="grid grid-cols-4 gap-4 flex-1">
            {yearlyQuartersStats.map((q, idx) => (
              <button 
                key={q.label}
                onClick={() => setActiveQuarter(idx)}
                className={`relative group flex flex-col justify-between p-6 rounded-[32px] border transition-all ${
                  activeQuarter === idx 
                    ? 'bg-electric-lime border-electric-lime shadow-[0_20px_40px_rgba(217,249,103,0.15)] overflow-hidden' 
                    : 'bg-surface border-border-dim hover:border-main/20'
                }`}
              >
                {activeQuarter === idx && (
                  <motion.div 
                    layoutId="activeQ"
                    className="absolute inset-0 bg-white/10 backdrop-blur-3xl -z-1"
                  />
                )}
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${activeQuarter === idx ? 'text-void/60' : 'text-muted'}`}>{q.label}</span>
                  <p className={`text-3xl font-black italic mt-1 ${activeQuarter === idx ? 'text-void' : 'text-main'}`}>{q.progress}%</p>
                </div>
                
                <div className="flex flex-col gap-2">
                  <span className={`text-[9px] font-bold uppercase ${activeQuarter === idx ? 'text-void/60' : 'text-muted'}`}>{q.taskCount} TASKS</span>
                  <div className={`h-1.5 w-full rounded-full overflow-hidden ${activeQuarter === idx ? 'bg-void/10' : 'bg-main/5'}`}>
                    <div 
                      className={`h-full ${activeQuarter === idx ? 'bg-void' : 'bg-electric-lime'}`} 
                      style={{ width: `${q.progress}%` }} 
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-border-dim">
             <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-bold text-muted uppercase">Week Selector ({QUARTERS[activeQuarter]})</span>
                <div className="flex gap-1">
                   {[...Array(12)].map((_, i) => (
                     <button 
                      key={i}
                      onClick={() => setActiveWeek(i)}
                      className={`w-8 h-8 rounded-xl text-[10px] font-bold flex items-center justify-center border transition-all ${
                        activeWeek === i ? 'bg-electric-lime text-void border-electric-lime shadow-lg' : 'bg-surface border-border-dim text-muted hover:text-main'
                      }`}
                     >
                       {i + 1}
                     </button>
                   ))}
                </div>
             </div>
          </div>
        </div>

        {/* Calendar / Navigation (Now focused on Days) */}
        <div className="col-span-12 md:col-span-4 glass-card p-8">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold italic uppercase tracking-tight text-main">Tactical Ops</h3>
              <span className="text-[10px] font-bold text-electric-lime">WEEK {activeWeek + 1} • {DAYS_OF_WEEK[activeDay]}</span>
           </div>

           <div className="flex gap-2 flex-wrap mb-8">
              {DAYS_OF_WEEK.map((day, idx) => (
                <button
                  key={day}
                  onClick={() => setActiveDay(idx)}
                  className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all border ${
                    activeDay === idx 
                      ? 'bg-electric-lime text-void border-electric-lime shadow-lg' 
                      : 'bg-surface text-muted border-border-dim hover:border-main/20'
                  }`}
                >
                  {day[0]}
                </button>
              ))}
            </div>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
              <AnimatePresence mode="popLayout">
                {dailyTasks.length === 0 ? (
                  <motion.div className="py-20 text-center border-2 border-dashed border-border-dim rounded-[32px]">
                    <p className="text-muted font-bold uppercase text-[10px]">No missions detected</p>
                  </motion.div>
                ) : (
                  dailyTasks.map((task) => (
                    <motion.div layout key={task.id} className={`group flex items-center justify-between p-4 rounded-[24px] border ${task.completed ? 'bg-surface opacity-50 border-border-dim' : 'bg-surface border-border-dim'}`}>
                       <button onClick={() => toggleTask(task.id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-electric-lime border-electric-lime text-void' : 'border-border-dim text-transparent'}`}>
                         <CheckCircle2 size={14} />
                       </button>
                       <span className={`flex-1 mx-3 text-sm font-bold ${task.completed ? 'line-through text-muted' : 'text-main'}`}>{task.title}</span>
                       <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setIsEditingTask(task.id); setTaskInput(task.title); setTaskPriority(task.priority); }} className="p-1 text-muted hover:text-main"><Edit2 size={14} /></button>
                          <button onClick={() => setTasks(tasks.filter(t => t.id !== task.id))} className="p-1 text-red-500/50 hover:text-red-500"><Trash2 size={14} /></button>
                       </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            <div className="mt-6 flex gap-2">
              <input
                type="text"
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="New objective..."
                className="flex-1 bg-surface border border-border-dim px-4 py-3 rounded-2xl text-xs font-bold text-main outline-none focus:border-electric-lime"
              />
              <button 
                onClick={addTask}
                className="bg-electric-lime text-void w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={20} />
              </button>
            </div>
        </div>

        {/* Burn-down chart */}
        <div className="col-span-12 md:col-span-8 glass-card p-8">
           <div className="flex justify-between items-center mb-8">
             <h3 className="text-xl font-bold italic uppercase tracking-tight flex items-center gap-2 text-main">
               <TrendingUp size={24} className="text-electric-lime" />
               Weekly Velocity Curve
             </h3>
             <span className="text-[10px] font-bold text-muted bg-main/5 px-3 py-1 rounded-full">{activeYear} • Q{activeQuarter + 1} • W{activeWeek + 1}</span>
           </div>
           
           <div className="h-[250px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={weeklyStats}>
                 <defs>
                   <linearGradient id="gradientLime" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#D9F967" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#D9F967" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#27272A" : "rgba(0,0,0,0.05)"} vertical={false} />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#fff' : '#0c0c0c', opacity: 0.4, fontSize: 10, fontWeight: 'black' }} />
                 <YAxis hide domain={[0, 100]} />
                 <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#18181B' : '#FFFFFF', border: 'none', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }} />
                 <Area type="monotone" dataKey="rate" stroke="#D9F967" strokeWidth={4} fillOpacity={1} fill="url(#gradientLime)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        {/* Hall of Fame / Badges */}
        <div className="col-span-12 md:col-span-4 glass-card p-8">
          <h3 className="text-lg font-black italic uppercase text-main mb-6 flex items-center gap-2">
            <Trophy size={20} className="text-electric-lime" />
            Strategic Achievements
          </h3>
          <div className="space-y-3">
             {badges.map(badge => (
               <div key={badge.id}><BadgeItem badge={badge} /></div>
             ))}
          </div>
          
          <div className="mt-8 p-6 bg-main/5 rounded-[32px] border border-border-dim">
             <div className="flex items-center gap-3 mb-4">
                <ShieldCheck size={24} className="text-electric-lime" />
                <span className="text-xs font-black italic uppercase text-main">System Core Status</span>
             </div>
             <p className="text-[10px] text-muted italic leading-relaxed">
               MISSION.12 ARCHITECTURE: Tracking {activeYear} trajectory across {tasks.length} operations. Current system stability: 100%.
             </p>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="mt-20 py-10 border-t border-border-dim flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-[10px] font-black text-muted uppercase tracking-[0.3em]">Yearly Continuity Hub • Vision Twelve v2.0</p>
        <div className="flex gap-6 opacity-30 grayscale saturate-0 pointer-events-none">
          <img src="https://picsum.photos/seed/tech/40/40" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
          <img src="https://picsum.photos/seed/data/40/40" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
          <img src="https://picsum.photos/seed/cyber/40/40" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
        </div>
      </footer>
    </div>
  );
}
