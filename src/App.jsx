import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { Trash2, Clock, Calendar, CheckCircle2, Circle, Plus, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- SORTABLE ROW COMPONENT ---
function SortableRow({ t, updateTaskField, cyclePriority, deleteTask, getTimeLeft }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.6 : 1,
  };

  const isDone = t.status === 'Completed';
  const p = t.priority?.toUpperCase() || 'MEDIUM';
  const time = getTimeLeft(t.deadline, isDone);

  return (
    <tr ref={setNodeRef} style={style} className="group hover:bg-white/[0.02] transition-colors bg-[#1a1a1a]">
      {/* GRAB HANDLE */}
      <td className="py-4 px-2 md:px-4 text-center cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical size={20} className="text-slate-800 group-hover:text-slate-600 mx-auto" />
      </td>
      
      {/* CHECKBOX */}
      <td className="py-4 px-2 md:px-4 text-center">
        <button onClick={() => updateTaskField(t.id, 'status', isDone ? 'To Do' : 'Completed')}>
          {isDone ? 
            <CheckCircle2 size={24} className="text-white mx-auto" strokeWidth={3} /> : 
            <Circle size={24} className="text-slate-800 hover:text-slate-600 mx-auto" strokeWidth={3} />
          }
        </button>
      </td>

      {/* TASK NAME - FLEXIBLE WIDTH */}
      <td className="py-4 px-2 md:px-4">
        <input 
          className={`bg-transparent border-none outline-none text-lg md:text-xl font-bold w-full transition-all ${isDone ? 'line-through text-slate-700' : 'text-slate-200 focus:text-blue-500'}`}
          value={t.name}
          onChange={(e) => updateTaskField(t.id, 'name', e.target.value)}
        />
      </td>

      {/* STATUS - HIDDEN ON PHONE TO STOP OVERLAP */}
      <td className="py-4 px-4 text-[10px] font-black uppercase text-slate-700 tracking-widest hidden md:table-cell">
        {t.status}
      </td>

      {/* PRIORITY */}
      <td className="py-4 px-2 md:px-4">
        <button 
          onClick={() => cyclePriority(t.id, p)}
          className={`mx-auto block w-28 md:w-36 py-2 rounded-full border-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center transition-all ${
            p === 'URGENT' ? 'bg-red-900/20 text-red-500 border-red-500/40' : 
            p === 'HIGH' ? 'bg-orange-900/20 text-orange-500 border-orange-500/40' : 
            p === 'MEDIUM' ? 'bg-blue-900/20 text-blue-400 border-blue-400/40' : 
            'bg-emerald-900/20 text-emerald-500 border-emerald-500/40'
          }`}
        >
          ● {p}
        </button>
      </td>

      {/* TIME - HIDDEN ON PHONE TO STOP OVERLAP */}
      <td className="py-4 px-4 hidden md:table-cell">
        <div className={`flex items-center gap-2 font-bold text-xs uppercase italic tracking-tighter ${time.color}`}>
          <Clock size={14} strokeWidth={3} />
          {time.text}
        </div>
      </td>

      {/* DATE */}
      <td className="py-4 px-2 md:px-4">
        <input 
          type="date"
          value={t.deadline}
          onChange={(e) => updateTaskField(t.id, 'deadline', e.target.value)}
          className="bg-transparent border border-white/5 rounded px-1 md:px-2 py-1 text-[10px] md:text-xs text-slate-400 font-bold [color-scheme:dark]"
        />
      </td>

      {/* DELETE */}
      <td className="py-4 px-2 text-right">
        <button onClick={() => deleteTask(t.id)} className="p-2 text-slate-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
          <Trash2 size={20} />
        </button>
      </td>
    </tr>
  );
}

// --- MAIN APP ---
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));
  const priorityOrder = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  useEffect(() => { fetchTasks(); }, []);

  // AUTO-SORT: Priority first, then Date
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

  async function fetchTasks() {
    const { data } = await supabase.from('tasks').select('*');
    if (data) setTasks(data);
    setLoading(false);
  }

  const getTimeLeft = (deadline, isDone) => {
    if (isDone) return { text: "DONE", color: "text-slate-600" };
    if (!deadline) return { text: "NO DATE", color: "text-blue-500/40" };
    const diff = Math.ceil((new Date(deadline) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: "OVERDUE", color: "text-red-600 animate-pulse" };
    if (diff === 0) return { text: "TODAY", color: "text-red-400" };
    return { text: `${diff} DAYS`, color: diff < 10 ? "text-yellow-400" : "text-emerald-500" };
  };

  const updateTaskField = async (id, field, value) => {
    await supabase.from('tasks').update({ [field]: value }).eq('id', id);
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const cyclePriority = (id, cur) => {
    const next = priorityOrder[(priorityOrder.indexOf(cur) + 1) % 4];
    updateTaskField(id, 'priority', next);
  };

  const addTask = async () => {
    const name = prompt("Task Name?");
    if (!name) return;
    const { data } = await supabase.from('tasks').insert([{ name, status: 'To Do', priority: 'MEDIUM', deadline: new Date().toISOString().split('T')[0] }]).select();
    if (data) setTasks([...tasks, data[0]]);
  };

  const deleteTask = async (id) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (loading) return <div className="bg-[#1a1a1a] min-h-screen text-white p-10 font-black italic">Syncing...</div>;

  return (
    <div className="min-h-screen w-full bg-[#1a1a1a] text-slate-300 p-4 md:p-14 font-sans select-none">
      <div className="w-full mb-12 flex justify-between items-center border-b border-white/5 pb-8">
        <div>
          <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase">To-Do List</h1>
          <p className="text-slate-600 font-bold uppercase tracking-[0.4em] text-[10px]">Auto-Saving Enabled</p>
        </div>
        <button onClick={addTask} className="bg-blue-600 text-white p-4 md:p-5 rounded-2xl shadow-lg active:scale-90 transition-transform">
          <Plus size={32} strokeWidth={4} />
        </button>
      </div>

      <div className="w-full overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full text-left border-separate border-spacing-y-2 table-fixed min-w-[600px] md:min-w-full">
            <thead>
              <tr className="text-slate-700 text-[10px] font-black uppercase tracking-[0.25em]">
                <th className="w-10 md:w-16 px-2 pb-4"></th>
                <th className="w-12 md:w-20 px-2 pb-4"></th>
                <th className="px-2 pb-4 text-slate-500">TASKS</th>
                <th className="w-32 hidden md:table-cell px-4 pb-4">STATUS</th>
                <th className="w-32 md:w-44 text-center px-2 pb-4">PRIORITY</th>
                <th className="w-32 hidden md:table-cell px-4 pb-4">TIME</th>
                <th className="w-32 md:w-48 text-center px-2 pb-4">DATE</th>
                <th className="w-10 px-2 pb-4"></th>
              </tr>
            </thead>
            <tbody>
              <SortableContext items={sortedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {sortedTasks.map((t) => (
                  <SortableRow key={t.id} t={t} updateTaskField={updateTaskField} cyclePriority={cyclePriority} deleteTask={deleteTask} getTimeLeft={getTimeLeft} />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>
    </div>
  );
}