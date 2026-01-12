import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { Trash2, Clock, CheckCircle2, Circle, Plus, GripVertical, ListTodo, GraduationCap, BookOpen, Target, Mic, Play, Square, Calendar } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';

// --- SORTABLE ROW ---
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
      <td className="py-4 px-2">
        <button onClick={() => cyclePriority(t.id, p)} className={`mx-auto block w-28 md:w-36 py-2 rounded-full border-2 text-[9px] font-black uppercase transition-all ${p === 'URGENT' ? 'bg-red-900/20 text-red-500 border-red-500/40' : p === 'HIGH' ? 'bg-orange-900/20 text-orange-500 border-orange-500/40' : p === 'MEDIUM' ? 'bg-blue-900/20 text-blue-400 border-blue-400/40' : 'bg-emerald-900/20 text-emerald-500 border-emerald-500/40'}`}>● {p}</button>
      </td>
      {/* CALENDAR COLUMN */}
      <td className="py-4 px-2 hidden md:table-cell">
        <div className="flex items-center gap-2 text-slate-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
           <Calendar size={14} />
           <input type="date" value={t.deadline || ''} onChange={(e) => updateTaskField(t.id, 'deadline', e.target.value)} className="bg-transparent border-none outline-none text-[10px] font-bold uppercase [color-scheme:dark]" />
        </div>
      </td>
      <td className="py-4 px-4 hidden md:table-cell"><div className={`flex items-center gap-2 font-bold text-xs italic ${time.color}`}><Clock size={14} strokeWidth={3} />{time.text}</div></td>
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
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let interval = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => setSecondsLeft(s => s - 1), 1000);
    } else if (secondsLeft === 0) {
      clearInterval(interval);
      supabase.from('study_sessions').insert([{ duration_minutes: 25 }]).then(() => {
        setIsActive(false); setSecondsLeft(25 * 60); fetchData();
      });
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  async function fetchData() {
    const { data: tData } = await supabase.from('tasks').select('*');
    const { data: sData } = await supabase.from('subjects').select('*').order('name', { ascending: true });
    const { data: lData } = await supabase.from('study_sessions').select('*');
    if (tData) setTasks(tData);
    if (sData) setSubjects(sData);
    if (lData) setStudyLogs(lData);
    setLoading(false);
  }

  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser not supported");
    const recognition = new SpeechRecognition();
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      const { data } = await supabase.from('tasks').insert([{ name: text, status: 'To Do', priority: 'MEDIUM', deadline: new Date().toISOString().split('T')[0] }]).select();
      if (data) fetchData();
    };
    recognition.start();
  };

  const addTask = async () => {
    const name = prompt("New Task?");
    if (!name) return;
    await supabase.from('tasks').insert([{ name, status: 'To Do', priority: 'MEDIUM', deadline: new Date().toISOString().split('T')[0] }]);
    fetchData();
  };

  const lineData = useMemo(() => {
    const last7 = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0];
    }).reverse();
    return last7.map(d => ({
      date: d.slice(5),
      mins: (studyLogs || []).filter(l => l.completed_at?.startsWith(d)).reduce((sum, l) => sum + l.duration_minutes, 0)
    }));
  }, [studyLogs]);

  const readinessData = useMemo(() => subjects.map(s => ({ 
    name: s.name, 
    p: Math.round((s.completed_modules / s.total_modules) * 100) || 0 
  })), [subjects]);

  const getTimeLeft = (deadline, isDone) => {
    if (isDone) return { text: "DONE", color: "text-slate-600" };
    if (!deadline) return { text: "NO DATE", color: "text-blue-500/40" };
    const diff = Math.ceil((new Date(deadline) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
    return { text: `${diff} DAYS`, color: diff <= 3 ? "text-orange-500 font-bold" : "text-emerald-500" };
  };

  if (loading) return <div className="bg-[#1a1a1a] min-h-screen text-white p-10 font-black italic">WIQ SYNCING...</div>;

  return (
    <div className="min-h-screen w-full bg-[#1a1a1a] text-slate-300 p-4 md:p-14 font-sans select-none relative">
      <div className="w-full mb-8 flex justify-between items-end border-b border-white/5 pb-8">
        <div>
          <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">W I Q</h1>
          <div className="flex gap-4 mt-6">
            <button onClick={() => setActiveTab('tasks')} className={`px-4 py-2 rounded-xl font-bold text-[10px] ${activeTab === 'tasks' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5'}`}>TASKS</button>
            <button onClick={() => setActiveTab('study')} className={`px-4 py-2 rounded-xl font-bold text-[10px] ${activeTab === 'study' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'bg-white/5'}`}>STUDY DASH</button>
          </div>
        </div>
      </div>

      {activeTab === 'tasks' && (
        <div className="w-full overflow-x-auto pb-24">
          <table className="w-full text-left border-separate border-spacing-y-2">
             <thead>
              <tr className="text-[10px] font-black uppercase text-slate-600 tracking-widest">
                <th className="w-12"></th><th className="w-12"></th><th>Task</th><th className="w-32 text-center">Priority</th><th className="w-48 hidden md:table-cell">Deadline</th><th className="w-24 hidden md:table-cell">Time</th><th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => <SortableRow key={t.id} t={t} updateTaskField={(id, f, v) => {supabase.from('tasks').update({[f]: v}).eq('id', id).then(() => fetchData());}} cyclePriority={(id, cur) => {const p = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']; const n = p[(p.indexOf(cur)+1)%4]; supabase.from('tasks').update({priority: n}).eq('id', id).then(() => fetchData());}} deleteTask={(id) => {supabase.from('tasks').delete().eq('id', id).then(() => fetchData());}} getTimeLeft={getTimeLeft} />)}
            </tbody>
          </table>

          {/* FLOATING ACTION BUTTONS */}
          <div className="fixed bottom-8 right-8 flex gap-4 z-50">
            <button onClick={startVoiceInput} className={`p-5 rounded-3xl transition-all shadow-2xl ${isListening ? 'bg-red-600 animate-pulse' : 'bg-purple-600 hover:bg-purple-500'}`}>
              <Mic size={28} className="text-white" strokeWidth={3} />
            </button>
            <button onClick={addTask} className="bg-blue-600 hover:bg-blue-500 p-5 rounded-3xl shadow-2xl transition-all active:scale-95">
              <Plus size={28} className="text-white" strokeWidth={4} />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'study' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-white min-h-[300px] shadow-2xl shadow-purple-900/20">
              <span className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-70">Focus Timer</span>
              <h2 className="text-6xl font-black italic mb-6">{Math.floor(secondsLeft/60)}:{String(secondsLeft%60).padStart(2,'0')}</h2>
              <button onClick={() => setIsActive(!isActive)} className="bg-white text-purple-600 p-4 rounded-full shadow-lg hover:scale-110 transition-transform">
                {isActive ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
              </button>
            </div>
            <div className="lg:col-span-2 bg-white/5 p-8 rounded-[2.5rem] border border-white/5 min-h-[300px]">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">Weekly Analytics</span>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={lineData}><Tooltip contentStyle={{backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px'}} /><Line type="monotone" dataKey="mins" stroke="#a855f7" strokeWidth={4} dot={{fill: '#a855f7', r: 6}} /></LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch pb-10">
            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex flex-col h-full">
              <h2 className="text-xl font-black text-white italic mb-8 uppercase tracking-tighter flex items-center gap-2"><BookOpen size={20} className="text-purple-500"/> Subjects</h2>
              <div className="space-y-4 overflow-y-auto pr-2 max-h-[400px]">
                {subjects.map(s => (
                  <div key={s.id} className="bg-[#1a1a1a] p-5 rounded-2xl border border-white/5 flex justify-between items-center">
                    <div className="flex-1"><h3 className="text-lg font-black text-slate-200 uppercase">{s.name}</h3><div className="w-full bg-white/5 h-2 rounded-full mt-3 overflow-hidden"><div className="bg-purple-500 h-full transition-all duration-700" style={{ width: `${(s.completed_modules/s.total_modules)*100}%` }}></div></div></div>
                    <div className="flex gap-2 ml-4">
                      <input type="number" value={s.completed_modules} onChange={(e) => supabase.from('subjects').update({ completed_modules: parseInt(e.target.value) }).eq('id', s.id).then(() => fetchData())} className="bg-white/5 w-12 text-center rounded text-purple-400 font-bold outline-none" />
                      <span className="text-slate-600">/</span>
                      <input type="number" value={s.total_modules} onChange={(e) => supabase.from('subjects').update({ total_modules: parseInt(e.target.value) }).eq('id', s.id).then(() => fetchData())} className="bg-white/5 w-12 text-center rounded text-slate-500 font-bold outline-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex flex-col h-full min-h-[400px]">
              <h2 className="text-xl font-black text-white italic mb-8 uppercase tracking-tighter flex items-center gap-2"><Target size={20} className="text-emerald-500"/> Readiness</h2>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={readinessData} layout="vertical" margin={{ left: -20, right: 20 }}>
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="name" type="category" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} width={100} axisLine={false} tickLine={false} />
                    <Bar dataKey="p" radius={[0, 10, 10, 0]} barSize={18}>
                      {readinessData.map((entry, index) => ( <Cell key={index} fill={entry.p > 70 ? '#10b981' : entry.p > 35 ? '#f59e0b' : '#ef4444'} /> ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}