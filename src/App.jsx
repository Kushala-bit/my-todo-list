import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { Trash2, Clock, CheckCircle2, Circle, Plus, GripVertical, Mic, Play, Square, Calendar, Check } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid } from 'recharts';

const PRIORITY_CYCLE = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const PRIORITY_STYLE = {
  URGENT: { bg: 'bg-red-900/40',     text: 'text-red-400',     border: 'border-red-500/50',     dot: '#f87171' },
  HIGH:   { bg: 'bg-orange-900/40',  text: 'text-orange-400',  border: 'border-orange-500/50',  dot: '#fb923c' },
  MEDIUM: { bg: 'bg-blue-900/40',    text: 'text-blue-400',    border: 'border-blue-500/50',    dot: '#60a5fa' },
  LOW:    { bg: 'bg-emerald-900/40', text: 'text-emerald-400', border: 'border-emerald-500/50', dot: '#34d399' },
};
const STATUS_STYLE = {
  'Completed':   { bg: 'bg-emerald-900/40', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  'In Progress': { bg: 'bg-amber-900/40',   text: 'text-amber-400',   border: 'border-amber-500/40' },
  'To Do':       { bg: 'bg-slate-800',      text: 'text-slate-400',   border: 'border-slate-600/40' },
};
const STATUS_CYCLE = ['To Do', 'In Progress', 'Completed'];

function getTimeLeft(deadline, isDone) {
  if (isDone) return { text: 'DONE', color: 'text-slate-500', bg: 'bg-slate-800', border: 'border-slate-700' };
  if (!deadline) return { text: 'NO DATE', color: 'text-slate-500', bg: 'bg-slate-800', border: 'border-slate-700' };
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(deadline); target.setHours(0,0,0,0);
  const diff = Math.round((target - today) / 86400000);
  if (diff === 0) return { text: 'TODAY',   color: 'text-orange-400', bg: 'bg-orange-900/30', border: 'border-orange-500/40' };
  if (diff < 0)  return { text: 'OVERDUE',  color: 'text-red-400',    bg: 'bg-red-900/30',    border: 'border-red-500/40' };
  return diff <= 2
    ? { text: `${diff} DAYS`, color: 'text-orange-400',  bg: 'bg-orange-900/30',  border: 'border-orange-500/40' }
    : { text: `${diff} DAYS`, color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-500/40' };
}

function SortableRow({ t, onUpdate, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 100 : 1, opacity: isDragging ? 0.4 : 1 };
  const isDone = t.status === 'Completed';
  const p  = t.priority?.toUpperCase() || 'MEDIUM';
  const ps = PRIORITY_STYLE[p] || PRIORITY_STYLE.MEDIUM;
  const ss = STATUS_STYLE[t.status] || STATUS_STYLE['To Do'];
  const time = getTimeLeft(t.deadline, isDone);

  return (
    <tr ref={setNodeRef} style={style} className="group border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors">
      <td className="py-4 px-3 w-10 text-center">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-700 group-hover:text-slate-500 transition-colors mx-auto block">
          <GripVertical size={16} />
        </button>
      </td>
      <td className="py-4 px-3 w-10 text-center">
        <button onClick={() => onUpdate(t.id, 'status', isDone ? 'To Do' : 'Completed')} className="mx-auto block">
          {isDone
            ? <CheckCircle2 size={22} className="text-white" strokeWidth={2.5} />
            : <Circle size={22} className="text-slate-700 hover:text-slate-400 transition-colors" strokeWidth={2} />}
        </button>
      </td>
      <td className="py-4 px-4 min-w-[180px]">
        <input
          className={`bg-transparent outline-none font-bold text-base w-full transition-colors
            ${isDone ? 'line-through text-slate-600' : 'text-white focus:text-white'}`}
          value={t.name}
          onChange={e => onUpdate(t.id, 'name', e.target.value)}
        />
      </td>
      <td className="py-4 px-3 hidden sm:table-cell w-32">
        <button
          onClick={() => { const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(t.status)+1)%3]; onUpdate(t.id,'status',next); }}
          className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${ss.bg} ${ss.text} ${ss.border}`}>
          {t.status}
        </button>
      </td>
      <td className="py-4 px-3 hidden sm:table-cell w-28">
        <button
          onClick={() => { const next = PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(p)+1)%4]; onUpdate(t.id,'priority',next); }}
          className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all inline-flex items-center gap-1.5 ${ps.bg} ${ps.text} ${ps.border}`}>
          <span style={{ color: ps.dot }}>●</span> {p}
        </button>
      </td>
      <td className="py-4 px-3 hidden md:table-cell w-28">
        <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border inline-flex items-center gap-1.5 ${time.bg} ${time.color} ${time.border}`}>
          <Clock size={10} strokeWidth={3} /> {time.text}
        </span>
      </td>
      <td className="py-4 px-3 hidden md:table-cell w-44">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-400 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5">
          <Calendar size={12} className="text-slate-600" />
          <input type="date" value={t.deadline||''} onChange={e => onUpdate(t.id,'deadline',e.target.value)}
            className="bg-transparent outline-none text-inherit [color-scheme:dark] cursor-pointer" />
        </div>
      </td>
      <td className="py-4 px-3 w-10 text-right">
        <button onClick={() => onDelete(t.id)} className="p-1.5 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  );
}

function AddRow({ onAdd }) {
  const [name, setName] = useState('');
  const submit = () => { if (!name.trim()) return; onAdd(name.trim()); setName(''); };
  return (
    <tr>
      <td className="py-3 pl-6 w-10">
        <Plus size={14} className="text-slate-700 mx-auto" />
      </td>
      <td colSpan={7} className="py-3 pr-4">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Add task — press Enter"
          className="bg-transparent outline-none text-sm text-slate-400 placeholder:text-slate-700 w-full font-medium focus:text-white transition-colors"
        />
      </td>
    </tr>
  );
}

function SubjectCard({ s, onUpdate, onDelete }) {
  const pct = s.total_modules > 0 ? Math.round((s.completed_modules/s.total_modules)*100) : 0;
  const color = pct > 70 ? '#10b981' : pct > 35 ? '#f59e0b' : '#ef4444';
  return (
    <div className="group flex items-center gap-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl px-5 py-4 hover:bg-white/[0.05] transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-white uppercase tracking-wider truncate mb-2">{s.name}</p>
        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, backgroundColor:color }} />
        </div>
      </div>
      <span className="text-xs font-black tabular-nums" style={{ color }}>{pct}%</span>
      <div className="flex items-center gap-1.5">
        <input type="number" min={0} max={s.total_modules} value={s.completed_modules}
          onChange={e => onUpdate(s.id,'completed_modules',parseInt(e.target.value)||0)}
          className="bg-white/[0.06] w-9 text-center rounded-lg text-white font-bold text-xs outline-none py-1" />
        <span className="text-slate-600 text-xs">/</span>
        <input type="number" min={1} value={s.total_modules}
          onChange={e => onUpdate(s.id,'total_modules',parseInt(e.target.value)||1)}
          className="bg-white/[0.06] w-9 text-center rounded-lg text-slate-400 font-bold text-xs outline-none py-1" />
      </div>
      <button onClick={() => onDelete(s.id)} className="text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-xs">
      <p className="text-slate-400 mb-0.5">{label}</p>
      <p className="text-white font-bold">{payload[0].value} min</p>
    </div>
  );
};

export default function App() {
  const [tasks, setTasks]             = useState([]);
  const [subjects, setSubjects]       = useState([]);
  const [studyLogs, setStudyLogs]     = useState([]);
  const [activeTab, setActiveTab]     = useState('tasks');
  const [loading, setLoading]         = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25*60);
  const [isActive, setIsActive]       = useState(false);
  const [addingSubject, setAddingSubject]   = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectTotal, setNewSubjectTotal] = useState(10);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const fetchData = useCallback(async () => {
    const [{ data: tData }, { data: sData }, { data: lData }] = await Promise.all([
      supabase.from('tasks').select('*'),
      supabase.from('subjects').select('*').order('name', { ascending: true }),
      supabase.from('study_sessions').select('*'),
    ]);
    if (tData) setTasks(tData);
    if (sData) setSubjects(sData);
    if (lData) setStudyLogs(lData);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let iv = null;
    if (isActive && secondsLeft > 0) iv = setInterval(() => setSecondsLeft(s => s-1), 1000);
    else if (isActive && secondsLeft === 0) {
      supabase.from('study_sessions')
        .insert([{ duration_minutes: 25, completed_at: new Date().toISOString() }])
        .then(() => { setIsActive(false); setSecondsLeft(25*60); fetchData(); });
    }
    return () => clearInterval(iv);
  }, [isActive, secondsLeft, fetchData]);

  const updateTask = useCallback(async (id, field, value) => {
    setTasks(prev => prev.map(t => t.id===id ? {...t,[field]:value} : t));
    await supabase.from('tasks').update({[field]:value}).eq('id',id);
  }, []);

  const deleteTask = useCallback(async (id) => {
    setTasks(prev => prev.filter(t => t.id!==id));
    await supabase.from('tasks').delete().eq('id',id);
  }, []);

  const addTask = useCallback(async (name) => {
    const { data } = await supabase.from('tasks')
      .insert([{ name, status:'To Do', priority:'MEDIUM', deadline: new Date().toLocaleDateString('en-CA') }])
      .select();
    if (data) setTasks(prev => [...prev, ...data]);
  }, []);

  const handleDragEnd = useCallback(async ({ active, over }) => {
    if (!over || active.id===over.id) return;
    const oi = tasks.findIndex(t => t.id===active.id);
    const ni = tasks.findIndex(t => t.id===over.id);
    setTasks(arrayMove(tasks, oi, ni));
  }, [tasks]);

  const updateSubject = useCallback(async (id, field, value) => {
    setSubjects(prev => prev.map(s => s.id===id ? {...s,[field]:value} : s));
    await supabase.from('subjects').update({[field]:value}).eq('id',id);
  }, []);

  const deleteSubject = useCallback(async (id) => {
    setSubjects(prev => prev.filter(s => s.id!==id));
    await supabase.from('subjects').delete().eq('id',id);
  }, []);

  const addSubject = useCallback(async () => {
    if (!newSubjectName.trim()) return;
    const { data } = await supabase.from('subjects')
      .insert([{ name: newSubjectName.trim(), completed_modules: 0, total_modules: newSubjectTotal }])
      .select();
    if (data) setSubjects(prev => [...prev,...data].sort((a,b) => a.name.localeCompare(b.name)));
    setNewSubjectName(''); setNewSubjectTotal(10); setAddingSubject(false);
  }, [newSubjectName, newSubjectTotal]);

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return alert('Voice input not supported.');
    const r = new SR();
    r.onstart  = () => setIsListening(true);
    r.onend    = () => setIsListening(false);
    r.onresult = async e => { await addTask(e.results[0][0].transcript); };
    r.start();
  };

  const lineData = useMemo(() => {
    const last7 = [...Array(7)].map((_,i) => { const d=new Date(); d.setDate(d.getDate()-(6-i)); return d.toLocaleDateString('en-CA'); });
    return last7.map(d => ({
      date: d.slice(5).replace('-','/'),
      mins: studyLogs.filter(l => l.completed_at?.startsWith(d)).reduce((s,l) => s+(l.duration_minutes||0), 0),
    }));
  }, [studyLogs]);

  const readinessData = useMemo(() =>
    subjects.map(s => ({ name:s.name, p:s.total_modules>0 ? Math.round((s.completed_modules/s.total_modules)*100) : 0 })),
  [subjects]);

  const totalMins      = useMemo(() => studyLogs.reduce((s,l) => s+(l.duration_minutes||0), 0), [studyLogs]);
  const completedTasks = tasks.filter(t => t.status==='Completed').length;
  const inProgress     = tasks.filter(t => t.status==='In Progress').length;
  const highPriority   = tasks.filter(t => ['HIGH','URGENT'].includes(t.priority?.toUpperCase())).length;
  const timerPct       = ((25*60-secondsLeft)/(25*60))*100;

  if (loading) return (
    <div className="min-h-screen bg-[#111] flex items-center justify-center">
      <p className="text-slate-600 text-xs font-black tracking-[0.4em] animate-pulse">SYNCING...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#111] text-slate-300 font-sans select-none">

      {/* HEADER */}
      <div className="px-8 md:px-16 pt-12 pb-8 border-b border-white/[0.05]">
        <h1 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter uppercase leading-none mb-1">WIQ</h1>
        <p className="text-slate-600 text-xs font-bold tracking-widest uppercase mb-7">
          {activeTab==='tasks' ? 'Drag to rearrange' : 'Study Dashboard'}
        </p>

        {activeTab==='tasks' && (
          <div className="flex flex-wrap gap-3 mb-6">
            {[
              { label:'Total',         value:tasks.length,   color:'bg-slate-800 border-slate-700 text-slate-300' },
              { label:'In Progress',   value:inProgress,     color:'bg-amber-900/40 border-amber-600/40 text-amber-400' },
              { label:'High Priority', value:highPriority,   color:'bg-red-900/40 border-red-600/40 text-red-400' },
              { label:'Completed',     value:completedTasks, color:'bg-emerald-900/40 border-emerald-600/40 text-emerald-400' },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border ${s.color}`}>
                <span className="text-2xl font-black">{s.value}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-70">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {[{id:'tasks',label:'TASKS'},{id:'study',label:'STUDY DASHBOARD'}].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-xl text-[11px] font-black tracking-widest transition-all
                ${activeTab===tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/[0.05] text-slate-500 hover:text-white hover:bg-white/[0.08]'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TASKS TAB */}
      {activeTab==='tasks' && (
        <div className="px-4 md:px-8 py-6 overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['GRAB','DONE','TASK','STATUS','PRIORITY','TIME LEFT','DATE',''].map((h,i) => (
                  <th key={i} className="py-3 px-3 text-left text-[9px] font-black tracking-[0.2em] text-slate-600 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {tasks.length===0 && (
                    <tr><td colSpan={8} className="py-20 text-center text-slate-700">
                      <p className="font-bold text-sm">No tasks yet — type below to add one</p>
                    </td></tr>
                  )}
                  {tasks.map(t => <SortableRow key={t.id} t={t} onUpdate={updateTask} onDelete={deleteTask} />)}
                  <AddRow onAdd={addTask} />
                </tbody>
              </SortableContext>
            </DndContext>
          </table>

          <div className="fixed bottom-8 right-8 z-50">
            <button onClick={startVoice}
              className={`p-4 rounded-2xl shadow-2xl transition-all text-white
                ${isListening ? 'bg-red-600 scale-110 animate-pulse' : 'bg-[#1e1e1e] border border-white/10 hover:bg-[#2a2a2a]'}`}>
              <Mic size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* STUDY TAB */}
      {activeTab==='study' && (
        <div className="px-8 md:px-16 py-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-3xl p-8 flex flex-col items-center justify-center min-h-[240px] relative overflow-hidden">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="5" />
                <circle cx="100" cy="100" r="85" fill="none"
                  stroke={isActive ? '#3b82f6' : '#1e293b'} strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={`${2*Math.PI*85}`}
                  strokeDashoffset={`${2*Math.PI*85*(1-timerPct/100)}`}
                  transform="rotate(-90 100 100)"
                  style={{ transition:'stroke-dashoffset 1s linear' }} />
              </svg>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 z-10">Focus Timer</span>
              <span className="text-5xl font-black text-white z-10 tabular-nums">
                {Math.floor(secondsLeft/60)}:{String(secondsLeft%60).padStart(2,'0')}
              </span>
              <button onClick={() => setIsActive(a => !a)}
                className={`mt-5 z-10 p-3.5 rounded-full transition-all ${isActive ? 'bg-slate-800 hover:bg-slate-700' : 'bg-blue-600 hover:bg-blue-500'}`}>
                {isActive ? <Square size={18} className="text-white" fill="currentColor" /> : <Play size={18} className="text-white" fill="currentColor" />}
              </button>
            </div>

            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              {[
                { label:'Total Study Time', value:`${Math.floor(totalMins/60)}h ${totalMins%60}m` },
                { label:'Sessions',         value:studyLogs.length },
                { label:'Subjects',         value:subjects.length },
                { label:'Avg Readiness',    value:`${readinessData.length ? Math.round(readinessData.reduce((s,d)=>s+d.p,0)/readinessData.length) : 0}%` },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-5">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">{s.label}</p>
                  <p className="text-3xl font-black text-white">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.05] rounded-3xl p-6">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-4">Study Minutes — Last 7 Days</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill:'#475569', fontSize:10, fontWeight:700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'#475569', fontSize:10, fontWeight:700 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<ChartTip />} />
                  <Line type="monotone" dataKey="mins" stroke="#3b82f6" strokeWidth={3} dot={{ fill:'#3b82f6', r:4 }} activeDot={{ r:6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-3xl p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Subjects</p>
                <button onClick={() => setAddingSubject(true)} className="flex items-center gap-1 text-[10px] font-black text-slate-500 hover:text-white transition-colors">
                  <Plus size={12} /> ADD
                </button>
              </div>
              {addingSubject && (
                <div className="mb-4 p-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl space-y-3">
                  <input autoFocus placeholder="Subject name" value={newSubjectName}
                    onChange={e => setNewSubjectName(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && addSubject()}
                    className="bg-transparent outline-none text-sm text-white placeholder:text-slate-600 w-full border-b border-white/10 pb-1" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Total modules:</span>
                    <input type="number" min={1} value={newSubjectTotal}
                      onChange={e => setNewSubjectTotal(parseInt(e.target.value)||1)}
                      className="bg-white/[0.06] w-14 text-center rounded-lg text-white text-xs font-bold outline-none py-1" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addSubject} className="flex items-center gap-1 bg-white text-black text-[10px] font-black px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">
                      <Check size={11} /> Save
                    </button>
                    <button onClick={() => setAddingSubject(false)} className="text-[10px] font-bold text-slate-600 hover:text-slate-400">Cancel</button>
                  </div>
                </div>
              )}
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {subjects.length===0 && <p className="text-slate-700 text-sm text-center py-10">No subjects yet</p>}
                {subjects.map(s => <SubjectCard key={s.id} s={s} onUpdate={updateSubject} onDelete={deleteSubject} />)}
              </div>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.05] rounded-3xl p-6">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-5">Readiness</p>
              {readinessData.length===0
                ? <p className="text-slate-700 text-sm text-center py-20">Add subjects to see readiness</p>
                : (
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={readinessData} layout="vertical" margin={{ left:0, right:24 }}>
                        <XAxis type="number" domain={[0,100]} hide />
                        <YAxis dataKey="name" type="category" tick={{ fill:'#64748b', fontSize:11, fontWeight:700 }} width={85} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTip />} />
                        <Bar dataKey="p" radius={[0,8,8,0]} barSize={14}>
                          {readinessData.map((e,i) => <Cell key={i} fill={e.p>70?'#10b981':e.p>35?'#f59e0b':'#ef4444'} />)}
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
    </div>
  );
}