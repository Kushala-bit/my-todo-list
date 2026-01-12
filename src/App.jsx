import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { Trash2, Clock, Calendar, CheckCircle2, Circle, Plus, GripVertical, ListTodo, GraduationCap, BookOpen, Target, Mic, Flame, Play, Square } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';

// --- SORTABLE ROW (LOCKED) ---
function SortableRow({ t, updateTaskField, cyclePriority, deleteTask, getTimeLeft }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 100 : 1, opacity: isDragging ? 0.6 : 1 };
  const isDone = t.status === 'Completed';
  const p = t.priority?.toUpperCase() || 'MEDIUM';
  const time = getTimeLeft(t.deadline, isDone);

  return (
    <tr ref={setNodeRef} style={style} className="group hover:bg-white/[0.02] transition-colors bg-[#1a1a1a]">
      <td className="py-4 px-2 text-center cursor-grab active:cursor-grabbing" {...attributes} {...listeners}><GripVertical size={20} className="text-slate-800 group-hover:text-slate-600 mx-auto" /></td>
      <td className="py-4 px-2 text-center">
        <button onClick={() => updateTaskField(t.id, 'status', isDone ? 'To Do' : 'Completed')}>
          {isDone ? <CheckCircle2 size={24} className="text-white mx-auto" strokeWidth={3} /> : <Circle size={24} className="text-slate-800 hover:text-slate-600 mx-auto" strokeWidth={3} />}
        </button>
      </td>
      <td className="py-4 px-2">
        <input className={`bg-transparent border-none outline-none text-lg md:text-xl font-bold w-full ${isDone ? 'line-through text-slate-700' : 'text-slate-200 focus:text-blue-500'}`} value={t.name} onChange={(e) => updateTaskField(t.id, 'name', e.target.value)} />
        <div className={`md:hidden flex items-center gap-1 text-[10px] font-bold uppercase italic mt-1 ${time.color}`}>
          <Clock size={10} /> {time.text}
        </div>
      </td>
      <td className="py-4 px-4 text-[10px] font-black uppercase text-slate-700 hidden md:table-cell">{t.status}</td>
      <td className="py-4 px-2">
        <button onClick={() => cyclePriority(t.id, p)} className={`mx-auto block w-28 md:w-36 py-2 rounded-full border-2 text-[9px] font-black uppercase transition-all ${p === 'URGENT' ? 'bg-red-900/20 text-red-500 border-red-500/40' : p === 'HIGH' ? 'bg-orange-900/20 text-orange-500 border-orange-500/40' : p === 'MEDIUM' ? 'bg-blue-900/20 text-blue-400 border-blue-400/40' : 'bg-emerald-900/20 text-emerald-500 border-emerald-500/40'}`}>● {p}</button>
      </td>
      <td className="py-4 px-4 hidden md:table-cell"><div className={`flex items-center gap-2 font-bold text-xs italic ${time.color}`}><Clock size={14} strokeWidth={3} />{time.text}</div></td>
      <td className="py-4 px-2"><input type="date" value={t.deadline} onChange={(e) => updateTaskField(t.id, 'deadline', e.target.value)} className="bg-transparent border border-white/5 rounded px-2 py-1 text-[10px] text-slate-400 [color-scheme:dark]" /></td>
      <td className="py-4 px-2 text-right"><button onClick={() => deleteTask(t.id)} className="p-2 text-slate-800 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button></td>
    </tr>
  );
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [studyLogs, setStudyLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  
  // POMODORO STATE
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
  const priorityOrder = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  useEffect(() => { fetchData(); }, []);

  // TIMER EFFECT
  useEffect(() => {
    let interval = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    } else if (secondsLeft === 0) {
      clearInterval(interval);
      supabase.from('study_sessions').insert([{ duration_minutes: 25 }]).then(() => {
        setIsActive(false); setSecondsLeft(25 * 60); fetchData(); alert("Session Logged!");
      });
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  async function fetchData() {
    const { data: tData } = await supabase.from('tasks').select('*');
    const { data: sData } = await supabase.from('subjects').select('*');
    const { data: lData } = await supabase.from('study_sessions').select('*');
    if (tData) setTasks(tData);
    if (sData) setSubjects(sData);
    if (lData) setStudyLogs(lData);
    setLoading(false);
  }

  // GRAPH LOGIC
  const lineData = useMemo(() => {
    const last7 = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0];
    }).reverse();
    return last7.map(d => ({
      date: d.slice(5),
      mins: studyLogs.filter(l => l.completed_at.startsWith(d)).reduce((sum, l) => sum + l.duration_minutes, 0)
    }));
  }, [studyLogs]);

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser not supported");
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      const { data } = await supabase.from('tasks').insert([{ name: text, status: 'To Do', priority: 'MEDIUM', deadline: new Date().toISOString().split('T')[0] }]).select();
      if (data) setTasks(prev => [...prev, data[0]]);
    };
    recognition.start();
  };

  const getTimeLeft = (deadline, isDone) => {
    if (isDone) return { text: "DONE", color: "text-slate-600" };
    if (!deadline) return { text: "NO DATE", color: "text-blue-500/40" };
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(deadline);
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: "OVERDUE", color: "text-red-600 font-black animate-pulse" };
    if (diffDays === 0) return { text: "TODAY", color: "text-red-500 font-bold" };
    if (diffDays <= 5) return { text: `${diffDays} DAYS`, color: "text-orange-500 font-bold" };
    if (diffDays <= 10) return { text: `${diffDays} DAYS`, color: "text-yellow-400 font-bold" };
    return { text: `${diffDays} DAYS`, color: "text-emerald-500" };
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      const pA = priorityOrder.indexOf(a.priority?.toUpperCase() || 'MEDIUM');
      const pB = priorityOrder.indexOf(b.priority?.toUpperCase() || 'MEDIUM');
      if (pB !== pA) return pB - pA;
      return new Date(a.deadline) - new Date(b.deadline);
    });
  }, [tasks]);

  const readinessData = useMemo(() => subjects.map(s => ({ name: s.name, percentage: Math.round((s.completed_modules / s.total_modules) * 100) || 0 })), [subjects]);

  const updateTaskField = async (id, field, value) => {
    await supabase.from('tasks').update({ [field]: value }).eq('id', id);
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const cyclePriority = (id, cur) => {
    const next = priorityOrder[(priorityOrder.indexOf(cur) + 1) % 4];
    updateTaskField(id, 'priority', next);
  };

  const addTask = async () => {
    const name = prompt("New Task?");
    if (!name) return;
    const { data } = await supabase.from('tasks').insert([{ name, status: 'To Do', priority: 'MEDIUM', deadline: new Date().toISOString().split('T')[0] }]).select();
    if (data) setTasks([...tasks, data[0]]);
  };

  const deleteTask = async (id) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(tasks.filter(t => t.id !== id));
  };

  if (loading) return <div className="bg-[#1a1a1a] min-h-screen text-white p-10 font-black italic uppercase">WIQ Syncing...</div>;

  return (
    <div className="min-h-screen w-full bg-[#1a1a1a] text-slate-300 p-4 md:p-14 font-sans select-none">
      <div className="w-full mb-8 flex justify-between items-end border-b border-white/5 pb-8">
        <div>
          <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">W I Q</h1>
          <div className="flex gap-4 mt-6">
            <button onClick={() => setActiveTab('tasks')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[10px] transition-all ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500'}`}><ListTodo size={14} /> TASKS</button>
            <button onClick={() => setActiveTab('study')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[10px] transition-all ${activeTab === 'study' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white/5 text-slate-500'}`}><GraduationCap size={14} /> STUDY DASHBOARD</button>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-orange-500/10 px-4 py-2 rounded-2xl border border-orange-500/20">
          <Flame className="text-orange-500" size={20} />
          <span className="text-white font-black italic uppercase text-xs tracking-wider">7 Day Streak</span>
        </div>
      </div>

      {activeTab === 'tasks' && (
        <div className="w-full overflow-x-auto">
          <div className="flex gap-2 mb-6">
            <button onClick={startVoiceInput} className={`p-4 rounded-2xl transition-all shadow-lg ${isListening ? 'bg-red-600 animate-pulse' : 'bg-purple-600 shadow-purple-600/20'}`}><Mic size={28} strokeWidth={3} /></button>
            <button onClick={addTask} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg active:scale-90"><Plus size={28} strokeWidth={4} /></button>
          </div>
          <table className="w-full text-left border-separate border-spacing-y-2 table-fixed min-w-[600px] md:min-w-full">
            <tbody>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => { const { active, over } = e; if (active.id !== over.id) { setTasks((items) => { const oldIndex = items.findIndex((i) => i.id === active.id); const newIndex = items.findIndex((i) => i.id === over.id); return arrayMove(items, oldIndex, newIndex); }); } }}>
                <SortableContext items={sortedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {sortedTasks.map((t) => ( <SortableRow key={t.id} t={t} updateTaskField={updateTaskField} cyclePriority={cyclePriority} deleteTask={deleteTask} getTimeLeft={getTimeLeft} /> ))}
                </SortableContext>
              </DndContext>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'study' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* POMODORO & ANALYTICS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-white shadow-xl">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-70">Focus Timer</span>
              <h2 className="text-6xl font-black italic mb-6">{Math.floor(secondsLeft/60)}:{String(secondsLeft%60).padStart(2,'0')}</h2>
              <button onClick={() => setIsActive(!isActive)} className="bg-white text-purple-600 p-4 rounded-full hover:scale-110 transition-transform">
                {isActive ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
              </button>
            </div>
            <div className="lg:col-span-2 bg-white/5 p-8 rounded-[2.5rem] border border-white/5 h-[300px]">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">Weekly Focus (Mins)</span>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <Tooltip contentStyle={{backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px'}} />
                  <Line type="monotone" dataKey="mins" stroke="#a855f7" strokeWidth={4} dot={{fill: '#a855f7', r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5">
              <h2 className="text-xl font-black text-white italic flex items-center gap-2 mb-8"><BookOpen className="text-purple-500" /> SUBJECTS</h2>
              {subjects.map(s => (
                <div key={s.id} className="bg-[#1a1a1a] p-5 rounded-2xl border border-white/5 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1"><h3 className="text-lg font-black text-slate-200 uppercase">{s.name}</h3><div className="w-full bg-white/5 h-2 rounded-full mt-3 overflow-hidden"><div className="bg-purple-500 h-full transition-all duration-1000" style={{ width: `${(s.completed_modules/s.total_modules)*100}%` }}></div></div></div>
                </div>
              ))}
            </div>
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 min-h-[400px]">
              <h2 className="text-xl font-black text-white italic flex items-center gap-2 mb-8"><Target className="text-emerald-500" /> EXAM READINESS</h2>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={readinessData} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} width={100} />
                  <Bar dataKey="percentage" radius={[0, 10, 10, 0]} barSize={25}>
                    {readinessData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.percentage > 80 ? '#10b981' : entry.percentage > 40 ? '#f59e0b' : '#ef4444'} /> ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}