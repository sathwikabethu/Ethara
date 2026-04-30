import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { TaskStatusEnum } from '@ethara/shared';
import toast from 'react-hot-toast';
import { Users, Plus, Calendar, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import TaskModal from '../components/TaskModal'; // We'll create this next

const COLUMNS = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'IN_REVIEW', title: 'In Review' },
  { id: 'DONE', title: 'Done' },
];

export default function ProjectDetails() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await api.get(`/projects/${id}`);
      return res.data.data;
    },
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const res = await api.get(`/projects/${id}/tasks`);
      return res.data.data;
    },
  });

  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      await api.patch(`/projects/${id}/tasks/${taskId}`, { status });
    },
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', id] });
      const previousTasks = queryClient.getQueryData(['tasks', id]);
      queryClient.setQueryData(['tasks', id], (old: any) => 
        old.map((t: any) => t.id === taskId ? { ...t, status } : t)
      );
      return { previousTasks };
    },
    onError: (err, newTodo, context: any) => {
      queryClient.setQueryData(['tasks', id], context.previousTasks);
      toast.error('Failed to update task status');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', id] });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;
    
    const task = tasks?.find((t: any) => t.id === taskId);
    if (task && task.status !== newStatus) {
      updateTaskStatus.mutate({ taskId, status: newStatus });
    }
  };

  if (projectLoading || tasksLoading) {
    return <div className="animate-pulse">Loading board...</div>;
  }

  const getTasksByStatus = (status: string) => {
    return tasks?.filter((t: any) => t.status === status) || [];
  };

  const isAdmin = project?.members?.some((m: any) => m.userId === user?.id && m.role === 'ADMIN');

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project?.name}</h1>
          <p className="text-sm text-slate-500">{project?.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2 overflow-hidden">
            {project?.members.slice(0, 5).map((member: any) => (
              <div key={member.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-300 flex items-center justify-center text-xs font-medium" title={member.user.name}>
                {member.user.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
          <Button onClick={() => setIsCreatingTask(true)}><Plus className="w-4 h-4 mr-2" /> Add Task</Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="flex gap-6 h-full min-h-[500px]">
            {COLUMNS.map((col) => (
              <div key={col.id} className="flex-shrink-0 w-80 bg-slate-100 rounded-lg flex flex-col">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-700 flex items-center justify-between">
                    {col.title}
                    <span className="bg-slate-200 text-slate-600 py-0.5 px-2 rounded-full text-xs">
                      {getTasksByStatus(col.id).length}
                    </span>
                  </h3>
                </div>
                {/* Droppable Area */}
                <div 
                  id={col.id}
                  className="flex-1 p-3 space-y-3 overflow-y-auto"
                  ref={(node) => {
                    // Simple droppable ref implementation logic for @dnd-kit without full Sortable setup
                    // In a real advanced implementation we'd use useDroppable here.
                    // For brevity and simplicity in a single file without extra components,
                    // we'll rely on a basic setup.
                  }}
                >
                  <DroppableColumn id={col.id} tasks={getTasksByStatus(col.id)} onTaskClick={setSelectedTask} />
                </div>
              </div>
            ))}
          </div>
        </DndContext>
      </div>

      {(selectedTask || isCreatingTask) && (
        <TaskModal 
          taskId={selectedTask} 
          projectId={id!}
          onClose={() => { setSelectedTask(null); setIsCreatingTask(false); }}
          projectMembers={project?.members || []}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

// Simple implementations of Droppable and Draggable for the board
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

function DroppableColumn({ id, tasks, onTaskClick }: { id: string, tasks: any[], onTaskClick: (id: string) => void }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="h-full min-h-[150px]">
      {tasks.map(task => (
        <DraggableTask key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
      ))}
    </div>
  );
}

function DraggableTask({ task, onClick }: { task: any, onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });
  const style = {
    transform: CSS.Translate.toString(transform),
  };
  
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white p-4 mb-3 rounded shadow-sm border cursor-grab active:cursor-grabbing hover:border-primary-300 ${isOverdue ? 'border-red-300' : 'border-slate-200'}`}
      onClick={(e) => {
        // Prevent click when dragging
        if (!transform) onClick();
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-medium text-slate-900">{task.title}</h4>
      </div>
      {task.assignedTo && (
        <div className="text-xs text-slate-500 mb-2">
          Assigned to: {task.assignedTo.name}
        </div>
      )}
      <div className="flex items-center justify-between mt-4">
        <span className={`text-[10px] font-semibold px-2 py-1 rounded ${
          task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
          task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
          task.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {task.priority}
        </span>
        {task.dueDate && (
          <div className={`flex items-center text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
            <Clock className="w-3 h-3 mr-1" />
            {new Date(task.dueDate).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}
