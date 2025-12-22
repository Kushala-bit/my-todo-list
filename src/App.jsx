import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { Trash2, Clock, Calendar, CheckCircle2, Circle, Plus, GripVertical, ListTodo, GraduationCap, BookOpen, Target } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

// --- SORTABLE ROW (LOCKED TASK LAYOUT) ---
function SortableRow({ t, updateTaskField, cyclePriority, deleteTask, getTimeLeft }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 100 : 1, opacity: isDragging ? 0.6 : 1 };
  const isDone = t.status === 'Completed';
  const p = t.priority?.toUpperCase() || 'MEDIUM';
  const time = getTimeLeft(t.deadline, isDone);

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
      <td className="py-4 px-2">
        <input className={`bg-transparent border-none outline-none text-lg md:text-xl font-bold w-full ${isDone ? 'line-through text-slate-700' : 'text-slate-200 focus:text-blue-500'}`} value={t.name} onChange={(e) => updateTaskField(t.id, 'name', e.target.value)} />
      </td>
      <td className="py-4 px-4 text-[10px] font-black uppercase text-slate-700 hidden md:table-cell">{t.status}</td>
      <td className="py-4 px-2">
        <button onClick={() => cyclePriority(t.id, p)} className={`mx-auto block w-28 md:w-36 py-2 rounded-full border-2 text-[9px] font-black uppercase transition-all ${p === 'URGENT' ? 'bg-red-900/20 text-red-500 border-red-500/40' : p === 'HIGH' ? 'bg-orange-900/20 text-orange-500 border-orange-500/40' : p === 'MEDIUM' ? 'bg-blue-900/20 text-blue-400 border-blue-400/40' : 'bg-emerald-900/20 text-emerald-500 border-emerald-500/40'}`}>● {p}</button>
      </td>
      <td className="py-4 px-4 hidden md:table-cell"><div className={`flex items-center gap-2 font-bold text-xs italic ${time.color}`}><Clock size={14} strokeWidth={3} />{time.text}</div></td>
      <td className="py-4 px-2">
        <input type="date" value={t.deadline} onChange={(e) => updateTaskField(t.id, 'deadline', e.target.value)} className="bg-transparent border border-white/5 rounded px-2 py-1 text-[10px] text-slate-400 [color-scheme:dark]" />
      </td>
      <td className="py-4 px-2 text-right"><button onClick={() => deleteTask(t.id)} className="p-2 text-slate-800 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button></td>
    </tr>
  );
}

// --- MAIN APP ---
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(true);
  
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
  const priorityOrder = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  useEffect(() => { 
    fetchData(); 
  }, []);

  async function fetchData() {
    const { data: tData } = await supabase.from('tasks').select('*');
    const { data: sData } = await supabase.from('subjects').select('*');
    if (tData) setTasks(tData);
    if (sData) setSubjects(sData);
    setLoading(false);
  }

  // Calculate Chart Data: (Completed / Total) * 100
  const readinessData = useMemo(() => {
    return subjects.map(s => ({
      name: s.name,
      percentage: Math.round((s.completed_modules / s.total_modules) * 100) || 0
    }));
  }, [subjects]);

  const addSubject = async () => {
    const name = prompt("Subject Name?");
    const total = prompt("Total Modules?");
    if (!name || !total) return;
    const { data } = await supabase.from('subjects').insert([{ name, total_modules: parseInt(total), completed_modules: 0 }]).select();
    if (data) setSubjects([...subjects, data[0]]);
  };

  const updateSubjectProgress = async (id, field, value) => {
    await supabase.from('subjects').update({ [field]: parseInt(value) }).eq('id', id);
    setSubjects(subjects.map(s => s.id === id ? { ...s, [field]: parseInt(value) } : s));
  };

  const deleteSubject = async (id) => {
    await supabase.from('subjects').delete().eq('id', id);
    setSubjects(subjects.filter(s => s.id !== id));
  };

  // ... (Task functions: updateTaskField, cyclePriority, addTask, deleteTask, getTimeLeft same as before)
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
  const getTimeLeft = (deadline, isDone) => {
    if (isDone) return { text: "DONE", color: "text-slate-600" };
    if (!deadline) return { text: "NO DATE", color: "text-blue-500/40" };
    const diff = Math.ceil((new Date(deadline) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
    return diff < 0 ? { text: "OVERDUE", color: "text-red-600" } : { text: `${diff} DAYS`, color: "text-emerald-500" };
  };

  if (loading) return <div className="bg-[#1a1a1a] min-h-screen text-white p-10 font-black italic">Syncing Cloud...</div>;

  return (
    <div className="min-h-screen w-full bg-[#1a1a1a] text-slate-300 p-4 md:p-14 font-sans select-none">
      {/* HEADER SECTION */}
      <div className="w-full mb-8 flex justify-between items-end border-b border-white/5 pb-8">
        <div>
          <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-none">WIQ</h1>
          <div className="flex gap-4 mt-6">
            <button onClick={() => setActiveTab('tasks')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[10px] transition-all ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}>
              <ListTodo size={14} /> TASKS
            </button>
            <button onClick={() => setActiveTab('study')} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[10px] transition-all ${activeTab === 'study' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}>
              <GraduationCap size={14} /> STUDY DASHBOARD
            </button>
          </div>
        </div>
      </div>

      {/* TASKS VIEW */}
      {activeTab === 'tasks' && (
        <div className="w-full">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-xs font-black text-slate-500 tracking-[0.3em] uppercase">To-Do List</h2>
             <button onClick={addTask} className="bg-blue-600 text-white p-3 rounded-xl active:scale-90 transition-transform"><Plus size={24} strokeWidth={4} /></button>
           </div>
           <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2 table-fixed min-w-[600px] md:min-w-full">
              <thead>
                <tr className="text-slate-700 text-[10px] font-black uppercase tracking-[0.25em]">
                  <th className="w-10 px-2 pb-4"></th><th className="w-12 px-2 pb-4"></th><th className="px-2 pb-4 text-slate-500">TASKS</th><th className="w-32 hidden md:table-cell px-4 pb-4 text-slate-500">STATUS</th><th className="w-32 md:w-44 text-center px-2 pb-4 text-slate-500">PRIORITY</th><th className="w-32 hidden md:table-cell px-4 pb-4 text-slate-500">TIME</th><th className="w-32 md:w-48 text-center px-2 pb-4 text-slate-500">DATE</th><th className="w-10 px-2 pb-4"></th>
                </tr>
              </thead>
              <tbody>
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {tasks.map((t) => (
                    <SortableRow key={t.id} t={t} updateTaskField={updateTaskField} cyclePriority={cyclePriority} deleteTask={deleteTask} getTimeLeft={getTimeLeft} />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STUDY DASHBOARD */}
      {activeTab === 'study' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* SUBJECTS LIST */}
            <div className="bg-white/5 p-6 md:p-8 rounded-[2.5rem] border border-white/5">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-black text-white italic flex items-center gap-2"><BookOpen className="text-purple-500" /> SUBJECTS</h2>
                <button onClick={addSubject} className="bg-purple-600/20 text-purple-400 p-2 rounded-lg hover:bg-purple-600 hover:text-white transition-all"><Plus size={20} /></button>
              </div>
              
              <div className="space-y-4">
                {subjects.map(s => (
                  <div key={s.id} className="bg-[#1a1a1a] p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-black text-slate-200 uppercase tracking-tight">{s.name}</h3>
                      <div className="w-full bg-white/5 h-2 rounded-full mt-3 overflow-hidden">
                        <div className="bg-purple-500 h-full transition-all duration-1000" style={{ width: `${(s.completed_modules/s.total_modules)*100}%` }}></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-600 uppercase">Modules Done</span>
                        <input type="number" value={s.completed_modules} onChange={(e) => updateSubjectProgress(s.id, 'completed_modules', e.target.value)} className="bg-white/5 w-16 text-center py-1 rounded-lg font-bold text-purple-400 border border-white/5" />
                      </div>
                      <span className="text-slate-700 font-black mt-2">/</span>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-600 uppercase">Total</span>
                        <input type="number" value={s.total_modules} onChange={(e) => updateSubjectProgress(s.id, 'total_modules', e.target.value)} className="bg-white/5 w-16 text-center py-1 rounded-lg font-bold text-slate-400 border border-white/5" />
                      </div>
                      <button onClick={() => deleteSubject(s.id)} className="text-slate-800 hover:text-red-500 transition-colors ml-2"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* READINESS CHART */}
            <div className="bg-white/5 p-6 md:p-8 rounded-[2.5rem] border border-white/5 flex flex-col min-h-[450px]">
              <h2 className="text-xl font-black text-white italic flex items-center gap-2 mb-8"><Target className="text-emerald-500" /> EXAM READINESS</h2>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={readinessData} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} width={100} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#1a1a1a', borderRadius: '12px', border: 'none'}} />
                    <Bar dataKey="percentage" radius={[0, 10, 10, 0]} barSize={25}>
                      {readinessData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.percentage > 80 ? '#10b981' : entry.percentage > 40 ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest text-center">Charts show completion percentage per subject</p>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}