import React, { useState, useEffect } from 'react';
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
    position: 'relative'
  };

  const isDone = t.status === 'Completed';
  const p = t.priority?.toUpperCase() || 'MEDIUM';
  const time = getTimeLeft(t.deadline, isDone);

  return (
    <tr ref={setNodeRef} style={style} className="group hover:bg-white/[0.02] transition-colors bg-[#1a1a1a]">
      {/* DRAG HANDLE (GRAB) */}
      <td className="py-4 px-4 text-center cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical size={20} className="text-slate-800 group-hover:text-slate-600 mx-auto" />
      </td>
      
      {/* DONE COLUMN */}
      <td className="py-4 px-4 text-center">
        <button onClick={() => updateTaskField(t.id, 'status', isDone ? 'To Do' : 'Completed')}>
          {isDone ? 
            <CheckCircle2 size={24} className="text-white mx-auto" strokeWidth={3} /> : 
            <Circle size={24} className="text-slate-800 hover:text-slate-600 mx-auto" strokeWidth={3} />
          }
        </button>
      </td>

      {/* TASK NAME */}
      <td className="py-4 px-4">
        <input 
          className={`bg-transparent border-none outline-none text-xl font-bold w-full transition-all ${isDone ? 'line-through text-slate-700' : 'text-slate-200 focus:text-blue-500'}`}
          value={t.name}
          onChange={(e) => updateTaskField(t.id, 'name', e.target.value)}
        />
      </td>

      {/* STATUS */}
      <td className="py-4 px-4 text-[10px] font-black uppercase text-slate-700 tracking-widest">
        {t.status}
      </td>

      {/* PRIORITY CLICK-TO-CYCLE */}
      <td className="py-4 px-4">
        <button 
          onClick={() => cyclePriority(t.id, p)}
          className={`mx-auto block w-36 py-2 rounded-full border-2 text-[10px] font-black uppercase tracking-widest text-center transition-all active:scale-95 ${
            p === 'URGENT' ? 'bg-red-900/20 text-red-500 border-red-500/40' : 
            p === 'HIGH' ? 'bg-orange-900/20 text-orange-500 border-orange-500/40' : 
            p === 'MEDIUM' ? 'bg-blue-900/20 text-blue-400 border-blue-400/40' : 
            'bg-emerald-900/20 text-emerald-500 border-emerald-500/40'
          }`}
        >
          ● {p}
        </button>
      </td>

      {/* TIME LEFT (COLOR LOGIC) */}
      <td className="py-4 px-4">
        <div className={`flex items-center gap-2 font-bold text-xs uppercase italic tracking-tighter ${time.color}`}>
          <Clock size={14} strokeWidth={3} />
          {time.text}
        </div>
      </td>

      {/* DATE PICKER */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3 bg-[#222] px-4 py-2 rounded-xl border border-white/5 w-fit shadow-inner">
          <Calendar size={14} className="text-slate-600" />
          <input 
            type="date"
            value={t.deadline}
            onChange={(e) => updateTaskField(t.id, 'deadline', e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-slate-400 font-bold cursor-pointer [color-scheme:dark]"
          />
        </div>
      </td>

      {/* DELETE ACTION */}
      <td className="py-4 px-4 text-right">
        <button onClick={() => deleteTask(t.id)} className="p-2 text-slate-800 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
          <Trash2 size={20} />
        </button>
      </td>
    </tr>
  );
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const priorityOrder = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  useEffect(() => { fetchTasks(); }, []);

  async function fetchTasks() {
    const { data } = await supabase.from('tasks').select('*').order('id', { ascending: true });
    if (data) setTasks(data);
    setLoading(false);
  }

  const getTimeLeft = (deadline, isDone) => {
    if (isDone) return { text: "DONE", color: "text-slate-600 font-bold" };
    if (!deadline) return { text: "NO DATE", color: "text-blue-500/40" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(deadline);
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: "OVERDUE", color: "text-[#ff0000] font-black animate-pulse" };
    if (diffDays === 0) return { text: "TODAY", color: "text-red-400 font-bold" };
    if (diffDays < 5) return { text: `${diffDays} DAYS`, color: "text-red-400/80" };
    if (diffDays < 10) return { text: `${diffDays} DAYS`, color: "text-yellow-400" };
    return { text: `${diffDays} DAYS`, color: "text-emerald-500" };
  };

  const updateTaskField = async (id, field, value) => {
    const { error } = await supabase.from('tasks').update({ [field]: value }).eq('id', id);
    if (!error) setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const cyclePriority = (id, currentPriority) => {
    const currentIndex = priorityOrder.indexOf(currentPriority?.toUpperCase() || 'MEDIUM');
    const nextIndex = (currentIndex + 1) % priorityOrder.length;
    updateTaskField(id, 'priority', priorityOrder[nextIndex]);
  };

  const addTask = async () => {
    const name = prompt("Task Name?");
    if (!name) return;
    const { data } = await supabase.from('tasks').insert([{ 
      name, status: 'To Do', priority: 'MEDIUM', deadline: new Date().toISOString().split('T')[0]
    }]).select();
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

  if (loading) return <div className="bg-[#1a1a1a] min-h-screen text-white p-10 font-bold text-2xl uppercase italic tracking-tighter">Syncing Cloud...</div>;

  return (
    <div className="min-h-screen w-full bg-[#1a1a1a] text-slate-300 p-8 md:p-14 font-sans select-none">
      <div className="w-full mb-12 flex justify-between items-center border-b border-white/5 pb-8">
        <div>
          <h1 className="text-7xl font-black text-white mb-2 italic tracking-tighter uppercase">To-Do List</h1>
          <p className="text-slate-600 font-bold uppercase tracking-[0.4em] text-xs">Auto-Saving Enabled</p>
        </div>
        <button onClick={addTask} className="bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl transition-all active:scale-90 shadow-lg shadow-blue-600/20">
          <Plus size={32} strokeWidth={4} />
        </button>
      </div>

      <div className="w-full">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full text-left border-separate border-spacing-y-2 table-fixed">
            <thead>
              <tr className="text-slate-700 text-xs font-black uppercase tracking-[0.25em]">
                <th className="px-4 pb-4 w-16"></th>
                <th className="px-4 pb-4 w-20"></th>
                <th className="px-4 pb-4 w-1/3 text-slate-500">TASKS</th>
                <th className="px-4 pb-4 w-32">STATUS</th>
                <th className="px-4 pb-4 w-44 text-center">PRIORITY</th>
                <th className="px-4 pb-4 w-32">TIME LEFT</th>
                <th className="px-4 pb-4 w-48">DATE</th>
                <th className="px-4 pb-4 w-16"></th>
              </tr>
            </thead>
            <tbody>
              <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {tasks.map((t) => (
                  <SortableRow 
                    key={t.id} 
                    t={t} 
                    updateTaskField={updateTaskField} 
                    cyclePriority={cyclePriority} 
                    deleteTask={deleteTask} 
                    getTimeLeft={getTimeLeft} 
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>
    </div>
  );
}