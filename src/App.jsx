import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import {
  Trash2, Clock, CheckCircle2, Circle, Plus, GripVertical,
  Mic, Play, Square, Calendar, BookOpen, ChevronRight,
  Zap, BarChart2, X, Check
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, CartesianGrid
} from 'recharts';

/* ─── PRIORITY CONFIG ─────────────────────────────────────── */
const PRIORITY_CYCLE = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const PRIORITY_STYLES = {
  URGENT: 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20',
  HIGH:   'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
  MEDIUM: 'bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500/20',
  LOW:    'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20',
};

/* ─── TIME LEFT HELPER ─────────────────────────────────────── */
function getTimeLeft(deadline, isDone) {
  if (isDone) return { text: 'DONE', color: 'text-slate-600' };
  if (!deadline) return { text: 'NO DATE', color: 'text-slate-600' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(deadline); target.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return { text: 'TODAY', color: 'text-amber-400 animate-pulse' };
  if (diff < 0)  return { text: 'OVERDUE', color: 'text-red-500' };
  return { text: `${diff}d`, color: diff <= 2 ? 'text-amber-400' : 'text-emerald-400' };
}

/* ─── SORTABLE ROW ─────────────────────────────────────────── */
function SortableRow({ t, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: t.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };
  const isDone = t.status === 'Completed';
  const p = t.priority?.toUpperCase() || 'MEDIUM';
  const time = getTimeLeft(t.deadline, isDone);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="group border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors"
    >
      <td className="py-3 pl-2 pr-1 w-8">
        <button
          {...attributes} {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-700 group-hover:text-slate-500 transition-colors"
        >
          <GripVertical size={16} />
        </button>
      </td>
      <td className="py-3 px-2 w-10">
        <button onClick={() => onUpdate(t.id, 'status', isDone ? 'To Do' : 'Completed')}>
          {isDone
            ? <CheckCircle2 size={20} className="text-emerald-500" strokeWidth={2.5} />
            : <Circle size={20} className="text-slate-700 hover:text-slate-400 transition-colors" strokeWidth={2} />
          }
        </button>
      </td>
      <td className="py-3 px-2">
        <input
          className={`bg-transparent outline-none text-sm font-medium w-full min-w-[120px] transition-colors
            ${isDone ? 'line-through text-slate-600' : 'text-slate-200 focus:text-white'}`}
          value={t.name}
          onChange={e => onUpdate(t.id, 'name', e.target.value)}
        />
      </td>
      <td className="py-3 px-2 hidden sm:table-cell w-28">
        <button
          onClick={() => {
            const next = PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(p) + 1) % 4];
            onUpdate(t.id, 'priority', next);
          }}
          className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${PRIORITY_STYLES[p]}`}
        >
          {p}
        </button>
      </td>
      <td className="py-3 px-2 hidden md:table-cell w-36">
        <div className="flex items-center gap-1.5 text-slate-600 hover:text-slate-400 transition-colors">
          <Calendar size={12} />
          <input
            type="date"
            value={t.deadline || ''}
            onChange={e => onUpdate(t.id, 'deadline', e.target.value)}
            className="bg-transparent outline-none text-[11px] font-medium text-inherit w-24 [color-scheme:dark] cursor-pointer"
          />
        </div>
      </td>
      <td className="py-3 px-2 hidden md:table-cell w-20">
        <span className={`text-[10px] font-black tracking-widest flex items-center gap-1 ${time.color}`}>
          <Clock size={10} strokeWidth={3} /> {time.text}
        </span>
      </td>
      <td className="py-3 pr-2 w-10 text-right">
        <button
          onClick={() => onDelete(t.id)}
          className="p-1.5 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

/* ─── INLINE ADD ROW ───────────────────────────────────────── */
function AddTaskRow({ onAdd }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  const submit = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName('');
  };

  return (
    <tr className="border-b border-white/[0.04]">
      <td colSpan={2} className="py-3 pl-10 pr-2">
        <Plus size={14} className="text-slate-700" />
      </td>
      <td className="py-3 px-2" colSpan={5}>
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="New task — press Enter to add"
          className="bg-transparent outline-none text-sm text-slate-400 placeholder:text-slate-700 w-full"
        />
      </td>
    </tr>
  );
}

/* ─── SUBJECT CARD ─────────────────────────────────────────── */
function SubjectCard({ s, onUpdate, onDelete }) {
  const pct = s.total_modules > 0
    ? Math.round((s.completed_modules / s.total_modules) * 100)
    : 0;
  const color = pct > 70 ? '#10b981' : pct > 35 ? '#f59e0b' : '#ef4444';

  return (
    <div className="group bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 hover:bg-white/[0.05] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{s.name}</h3>
        <button
          onClick={() => onDelete(s.id)}
          className="text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black" style={{ color }}>{pct}%</span>
        <div className="flex items-center gap-2">
          <input
            type="number" min={0} max={s.total_modules} value={s.completed_modules}
            onChange={e => onUpdate(s.id, 'completed_modules', parseInt(e.target.value) || 0)}
            className="bg-white/[0.06] w-10 text-center rounded-lg text-white font-bold text-xs outline-none focus:ring-1 focus:ring-white/20 py-1"
          />
          <span className="text-slate-600 text-xs font-bold">/</span>
          <input
            type="number" min={1} value={s.total_modules}
            onChange={e => onUpdate(s.id, 'total_modules', parseInt(e.target.value) || 1)}
            className="bg-white/[0.06] w-10 text-center rounded-lg text-slate-400 font-bold text-xs outline-none focus:ring-1 focus:ring-white/20 py-1"
          />
          <span className="text-slate-600 text-xs">modules</span>
        </div>
      </div>
    </div>
  );
}

/* ─── CUSTOM TOOLTIP ───────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-white font-bold">{payload[0].value} min</p>
    </div>
  );
};

/* ─── MAIN APP ─────────────────────────────────────────────── */
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [studyLogs, setStudyLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [addingSubject, setAddingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTotal, setNewSubjectTotal] = useState(10);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const fetchData = useCallback(async () => {
    const [{ data: tData }, { data: sData }, { data: lData }] = await Promise.all([
      supabase.from('tasks').select('*').order('position', { ascending: true }),
      supabase.from('subjects').select('*').order('name', { ascending: true }),
      supabase.from('study_sessions').select('*').order('completed_at', { ascending: false }),
    ]);
    if (tData) setTasks(tData);
    if (sData) setSubjects(sData);
    if (lData) setStudyLogs(lData);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let interval = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    } else if (isActive && secondsLeft === 0) {
      supabase.from('study_sessions')
        .insert([{ duration_minutes: 25, completed_at: new Date().toISOString() }])
        .then(() => { setIsActive(false); setSecondsLeft(25 * 60); fetchData(); });
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft, fetchData]);

  const updateTask = useCallback(async (id, field, value) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    await supabase.from('tasks').update({ [field]: value }).eq('id', id);
  }, []);

  const deleteTask = useCallback(async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
  }, []);

  const addTask = useCallback(async (name) => {
    const { data } = await supabase
      .from('tasks')
      .insert([{ name, status: 'To Do', priority: 'MEDIUM', deadline: new Date().toLocaleDateString('en-CA'), position: tasks.length }])
      .select();
    if (data) setTasks(prev => [...prev, ...data]);
  }, [tasks.length]);

  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = tasks.findIndex(t => t.id === active.id);
    const newIdx = tasks.findIndex(t => t.id === over.id);
    const reordered = arrayMove(tasks, oldIdx, newIdx);
    setTasks(reordered);
    await Promise.all(
      reordered.map((t, i) => supabase.from('tasks').update({ position: i }).eq('id', t.id))
    );
  }, [tasks]);

  const updateSubject = useCallback(async (id, field, value) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    await supabase.from('subjects').update({ [field]: value }).eq('id', id);
  }, []);

  const deleteSubject = useCallback(async (id) => {
    setSubjects(prev => prev.filter(s => s.id !== id));
    await supabase.from('subjects').delete().eq('id', id);
  }, []);

  const addSubject = useCallback(async () => {
    if (!newSubjectName.trim()) return;
    const { data } = await supabase
      .from('subjects')
      .insert([{ name: newSubjectName.trim(), completed_modules: 0, total_modules: newSubjectTotal }])
      .select();
    if (data) setSubjects(prev => [...prev, ...data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewSubjectName(''); setNewSubjectTotal(10); setAddingSubject(false);
  }, [newSubjectName, newSubjectTotal]);

  const startVoiceInput = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert('Voice input not supported in this browser.');
    const r = new SR();
    r.onstart = () => setIsListening(true);
    r.onend   = () => setIsListening(false);
    r.onresult = async (e) => {
      const text = e.results[0][0].transcript;
      await addTask(text);
    };
    r.start();
  };

  const lineData = useMemo(() => {
    const last7 = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('en-CA');
    });
    return last7.map(d => ({
      date: d.slice(5).replace('-', '/'),
      mins: (studyLogs || [])
        .filter(l => l.completed_at?.startsWith(d))
        .reduce((sum, l) => sum + (l.duration_minutes || 0), 0),
    }));
  }, [studyLogs]);

  const readinessData = useMemo(() =>
    subjects.map(s => ({
      name: s.name,
      p: s.total_modules > 0 ? Math.round((s.completed_modules / s.total_modules) * 100) : 0,
    })),
  [subjects]);

  const totalStudyMins = useMemo(() =>
    studyLogs.reduce((s, l) => s + (l.duration_minutes || 0), 0),
  [studyLogs]);

  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const timerPct = ((25 * 60 - secondsLeft) / (25 * 60)) * 100;

  if (loading) return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
      <div className="text-slate-600 text-xs font-black tracking-[0.3em] animate-pulse">SYNCING</div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#0d0d0d] text-slate-300 font-sans select-none">
      <header className="sticky top-0 z-40 bg-[#0d0d0d]/90 backdrop-blur-xl border-b border-white/[0.05] px-6 md:px-12 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-black text-white tracking-tight">WIQ</h1>
            <nav className="flex gap-1">
              {[
                { id: 'tasks', label: 'Tasks', icon: <Zap size={12} /> },
                { id: 'study', label: 'Study', icon: <BarChart2 size={12} /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all
                    ${activeTab === tab.id
                      ? 'bg-white text-black'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
                    }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-600 font-bold">
            <span>{completedTasks}/{tasks.length} done</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 md:px-12 py-8">

        {activeTab === 'tasks' && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: 'Total', value: tasks.length },
                { label: 'In Progress', value: tasks.filter(t => t.status !== 'Completed').length },
                { label: 'Completed', value: completedTasks },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">{s.label}</p>
                  <p className="text-2xl font-black text-white">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
              {tasks.length === 0 && (
                <div className="py-16 text-center text-slate-700 text-sm">
                  <Circle size={32} className="mx-auto mb-3 opacity-30" strokeWidth={1} />
                  <p className="font-bold">No tasks yet</p>
                  <p className="text-xs mt-1">Type below to add one</p>
                </div>
              )}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <table className="w-full">
                    <tbody>
                      {tasks.map(t => (
                        <SortableRow key={t.id} t={t} onUpdate={updateTask} onDelete={deleteTask} />
                      ))}
                      <AddTaskRow onAdd={addTask} />
                    </tbody>
                  </table>
                </SortableContext>
              </DndContext>
            </div>

            <div className="fixed bottom-8 right-8 z-50">
              <button
                onClick={startVoiceInput}
                className={`p-3.5 rounded-2xl shadow-2xl transition-all text-white
                  ${isListening ? 'bg-red-600 scale-110 animate-pulse' : 'bg-[#1e1e1e] border border-white/10 hover:bg-[#2a2a2a]'}`}
              >
                <Mic size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'study' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px] relative overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
                  <circle
                    cx="100" cy="100" r="85"
                    fill="none" stroke={isActive ? '#a855f7' : '#334155'}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 85}`}
                    strokeDashoffset={`${2 * Math.PI * 85 * (1 - timerPct / 100)}`}
                    transform="rotate(-90 100 100)"
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 z-10">Focus</span>
                <span className="text-4xl font-black text-white z-10 tabular-nums">
                  {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
                </span>
                <button
                  onClick={() => setIsActive(a => !a)}
                  className={`mt-4 z-10 p-3 rounded-full transition-all
                    ${isActive ? 'bg-slate-800 hover:bg-slate-700' : 'bg-purple-600 hover:bg-purple-500'}`}
                >
                  {isActive
                    ? <Square size={16} className="text-white" fill="currentColor" />
                    : <Play size={16} className="text-white" fill="currentColor" />
                  }
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 lg:col-span-2">
                {[
                  { label: 'Total Study Time', value: `${Math.floor(totalStudyMins / 60)}h ${totalStudyMins % 60}m` },
                  { label: 'Sessions Done', value: studyLogs.length },
                  { label: 'Subjects', value: subjects.length },
                  { label: 'Avg Readiness', value: `${readinessData.length ? Math.round(readinessData.reduce((s, d) => s + d.p, 0) / readinessData.length) : 0}%` },
                ].map(s => (
                  <div key={s.label} className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-5">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">{s.label}</p>
                    <p className="text-2xl font-black text-white">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-6">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4">Study Minutes — Last 7 Days</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="mins" stroke="#a855f7" strokeWidth={3} dot={{ fill: '#a855f7', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Subjects</p>
                  <button
                    onClick={() => setAddingSubject(true)}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-white transition-colors"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>

                {addingSubject && (
                  <div className="mb-4 p-4 bg-white/[0.04] border border-white/[0.08] rounded-xl flex flex-col gap-3">
                    <input
                      autoFocus
                      placeholder="Subject name"
                      value={newSubjectName}
                      onChange={e => setNewSubjectName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addSubject()}
                      className="bg-transparent outline-none text-sm text-white placeholder:text-slate-600 border-b border-white/10 pb-1"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Total modules:</span>
                      <input
                        type="number" min={1} value={newSubjectTotal}
                        onChange={e => setNewSubjectTotal(parseInt(e.target.value) || 1)}
                        className="bg-white/[0.06] w-14 text-center rounded-lg text-white text-xs font-bold outline-none py-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addSubject} className="flex items-center gap-1 bg-white text-black text-[10px] font-black px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                        <Check size={11} /> Save
                      </button>
                      <button onClick={() => setAddingSubject(false)} className="text-[10px] font-bold text-slate-600 hover:text-slate-400 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                  {subjects.length === 0 && (
                    <p className="text-slate-700 text-sm text-center py-8">No subjects yet</p>
                  )}
                  {subjects.map(s => (
                    <SubjectCard key={s.id} s={s} onUpdate={updateSubject} onDelete={deleteSubject} />
                  ))}
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-6">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-5">Readiness</p>
                {readinessData.length === 0
                  ? <p className="text-slate-700 text-sm text-center py-16">Add subjects to see readiness</p>
                  : (
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={readinessData} layout="vertical" margin={{ left: 0, right: 24 }}>
                          <XAxis type="number" domain={[0, 100]} hide />
                          <YAxis
                            dataKey="name" type="category"
                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                            width={80} axisLine={false} tickLine={false}
                          />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="p" radius={[0, 6, 6, 0]} barSize={12}>
                            {readinessData.map((entry, i) => (
                              <Cell key={i} fill={entry.p > 70 ? '#10b981' : entry.p > 35 ? '#f59e0b' : '#ef4444'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )
                }
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}