import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { Trash2, Clock, Calendar, CheckCircle2, Circle, Plus, GripVertical, ListTodo, GraduationCap, BookOpen, Target, Mic } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

function SortableRow({ t, updateTaskField, cyclePriority, deleteTask, getTimeLeft }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 100 : 1, opacity: isDragging ? 0.6 : 1 };
  const isDone = t.status === 'Completed';
  const p = t.priority?.toUpperCase() || 'MEDIUM';
  const time = getTimeLeft(t.deadline, isDone);
  const displayDate = t.deadline ? t.deadline.split('-').reverse().join('/') : 'NO DATE';

  return (
    <tr ref={setNodeRef} style={style} className="group hover:bg-white/[0.02] transition-colors bg-[#1a1a1a]">
      <td className="py-4 px-2 text-center cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical size={20} className="text-slate-800 group-hover:text-slate-600 mx-auto" />
      </td>
      <td className="py-4 px-2 text-center">
        <button onClick={() => updateTaskField(t.id, 'status', isDone ? 'To Do' : 'Completed')}>
          {isDone ? <CheckCircle2 size={24} className="text-white mx-auto" strokeWidth={3} /> : <Circle size={24} className="text-slate-800 hover:text-slate-600 mx-auto" strokeWidth={3} />}
        </button>
      </td>
      <td className="py-4 px-2 flex-1">
        <input className={`bg-transparent border-none outline-none text-lg md:text-xl font-bold w-full ${isDone ? 'line-through text-slate-700' : 'text-slate-200 focus:text-blue-500'}`} value={t.name} onChange={(e) => updateTaskField(t.id, 'name', e.target.value)} />
        <div className={`md:hidden flex items-center gap-1 text-[10px] font-bold uppercase italic mt-1 ${time.color}`}><Clock size={10} /> {time.text}</div>
      </td>
      <td className="py-4 px-2">
        <button onClick={() => cyclePriority(t.id, p)} className={`mx-auto block w-28 md:w-36 py-2 rounded-full border-2 text-[9px] font-black uppercase transition-all ${p === 'URGENT' ? 'bg-red-900/20 text-red-500 border-red-500/40' : p === 'HIGH' ? 'bg-orange-900/20 text-orange-500 border-orange-500/40' : p === 'MEDIUM' ? 'bg-blue-900/20 text-blue-400 border-blue-400/40' : 'bg-emerald-900/20 text-emerald-500 border-emerald-500/40'}`}>● {p}</button>
      </td>
      <td className="py-4 px-4 hidden md:table-cell">
        <div className={`flex items-center gap-2 font-bold text-xs italic ${time.color}`}><Clock size={14} strokeWidth={3} />{time.text}</div>
      </td>
      <td className="py-4 px-2">
        <div className="relative flex items-center justify-center gap-2 opacity-60 hover:opacity-100 transition-opacity">
          <span className="text-[11px] font-bold text-slate-300 pointer-events-none">{displayDate}</span>
          <input type="date" value={t.deadline || ''} onChange={(e) => updateTaskField(t.id, 'deadline', e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer [color-scheme:dark]" />
          <Calendar size={14} className="text-slate-500" />
        </div>
      </td>
      <td className="py-4 px-2 text-right">
        <button onClick={() => deleteTask(t.id)} className="p-2 text-slate-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={20} /></button>
      </td>
    </tr>
  );
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
  const priorityOrder = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: tData } = await supabase.from('tasks').select('*').order('position', { ascending: true });
    const { data: sData } = await supabase.from('subjects').select('*').order('name', { ascending: true });
    if (tData) setTasks(tData);
    if (sData) setSubjects(sData);
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
      await supabase.from('tasks').insert([{ 
        name: text, 
        status: 'To Do', 
        priority: 'MEDIUM', 
        deadline: new Date().toISOString().split('T')[0],
        position: tasks.length 
      }]);
      fetchData();
    };
    recognition.start();
  };

  const updateTaskField = async (id, field, value) => {
    await supabase.from('tasks').update({ [field]: value }).eq('id', id);
    fetchData();
  };

  const cyclePriority = (id, cur) => {
    const next = priorityOrder[(priorityOrder.indexOf(cur) + 1) % 4];
    updateTaskField(id, 'priority', next);
  };

  const addTask = async () => {
    const name = prompt("New Task?");
    if (!name) return;
    await supabase.from('tasks').insert([{ 
      name, status: 'To Do', priority: 'MEDIUM', 
      deadline: new Date().toISOString().split('T')[0], 
      position: tasks.length 
    }]);
    fetchData();
  };

  const deleteTask = async (id) => {
    await supabase.from('tasks').delete().eq('id', id);
    fetchData();
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = tasks.findIndex(t => t.id === active.id);
      const newIndex = tasks.findIndex(t => t.id === over.id);
      const newOrder = arrayMove(tasks, oldIndex, newIndex);
      setTasks(newOrder);
      const updates = newOrder.map((t, i) => ({ ...t, position: i }));
      await supabase.from('tasks').upsert(updates);
    }
  };

  const getTimeLeft = (deadline, isDone) => {
    if (isDone) return { text: "DONE", color: "text-slate-600" };
    if (!deadline) return { text: "NO DATE", color: "text-blue-500/40" };
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(deadline + 'T00:00:00'); target.setHours(0,0,0,0);
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { text: "OVERDUE", color: "text-red-600 font-black animate-pulse" };
    if (diffDays === 0) return { text: "TODAY", color: "text-orange-500 font-bold" };
    return { text: `${diffDays} DAYS`, color: diffDays <= 3 ? "text-orange-400" : "text-emerald-500" };
  };

  const readinessData = useMemo(() => subjects.map(s => ({ 
    name: s.name, 
    percentage: Math.round((s.completed_modules / s.total_modules) * 100) || 0 
  })), [subjects]);

  if (loading) return <div className="bg-[#1a1a1a] min-h-screen text-white p-10 font-black italic uppercase">Syncing...</div>;

  return (
    <div className="min-h-screen w-full bg-[#1a1a1a] text-slate-300 p-4 md:p-14 font-sans select-none relative">
      <div className="w-full mb-8 flex justify-between items-end border-b border-white/5 pb-8">
        <div>
          <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">W I Q</h1>
          <div className="flex gap-4 mt-6">
            <button onClick={() => setActiveTab('tasks')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[10px] ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500'}`}><ListTodo size={14} /> TASKS</button>
            <button onClick={() => setActiveTab('study')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[10px] ${activeTab === 'study' ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-500'}`}><GraduationCap size={14} /> STUDY DASHBOARD</button>
          </div>
        </div>
        {activeTab === 'tasks' && (
          <div className="flex gap-3">
             <button onClick={startVoiceInput} className={`p-4 rounded-2xl transition-all shadow-lg ${isListening ? 'bg-red-600 animate-pulse' : 'bg-purple-600 shadow-purple-600/20'}`}><Mic size={28} strokeWidth={3} /></button>
             <button onClick={addTask} className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl active:scale-95 transition-all"><Plus size={28} strokeWidth={4} /></button>
          </div>
        )}
      </div>

      {activeTab === 'tasks' && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="w-full overflow-x-auto pb-20">
            <table className="w-full text-left border-separate border-spacing-y-2 table-fixed min-w-[700px]">
              <thead>
                <tr className="text-slate-700 text-[10px] font-black uppercase tracking-widest"><th className="w-10 px-2 pb-4"></th><th className="w-12 px-2 pb-4"></th><th className="px-2 pb-4">TASKS</th><th className="w-32 md:w-44 text-center px-2 pb-4">PRIORITY</th><th className="w-32 hidden md:table-cell px-4 pb-4">TIME</th><th className="w-32 md:w-48 text-center px-2 pb-4">DATE</th><th className="w-10 px-2 pb-4"></th></tr>
              </thead>
              <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {tasks.map((t) => ( <SortableRow key={t.id} t={t} updateTaskField={updateTaskField} cyclePriority={cyclePriority} deleteTask={deleteTask} getTimeLeft={getTimeLeft} /> ))}
                </tbody>
              </SortableContext>
            </table>
          </div>
        </DndContext>
      )}

      {activeTab === 'study' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 h-[450px]">
            <h2 className="text-xl font-black text-white italic mb-8 uppercase flex items-center gap-2"><BookOpen className="text-purple-500" /> SUBJECTS</h2>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {subjects.map(s => (
                <div key={s.id} className="bg-[#1a1a1a] p-5 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div className="flex-1 mr-6">
                    <h3 className="text-lg font-black text-slate-200 uppercase">{s.name}</h3>
                    <div className="w-full bg-white/5 h-2 rounded-full mt-2 overflow-hidden"><div className="bg-purple-500 h-full" style={{ width: `${(s.completed_modules/s.total_modules)*100}%` }}></div></div>
                  </div>
                  <div className="flex gap-2">
                    <input type="number" value={s.completed_modules} onChange={(e) => supabase.from('subjects').update({ completed_modules: parseInt(e.target.value) }).eq('id', s.id).then(() => fetchData())} className="bg-white/10 w-12 text-center rounded text-purple-400 font-bold p-1" />
                    <span className="text-slate-600 font-black pt-1">/ {s.total_modules}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 h-[450px]">
            <h2 className="text-xl font-black text-white italic mb-8 uppercase flex items-center gap-2"><Target className="text-emerald-500" /> READINESS</h2>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={readinessData} layout="vertical" margin={{ left: -20, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis dataKey="name" type="category" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} width={90} axisLine={false} tickLine={false} />
                  <Bar dataKey="percentage" radius={[0, 8, 8, 0]} barSize={18}>
                    {readinessData.map((entry, index) => ( <Cell key={index} fill={entry.percentage > 75 ? '#10b981' : entry.percentage > 40 ? '#f59e0b' : '#ef4444'} /> ))}
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