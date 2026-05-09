import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { DndContext, type DragEndEvent, closestCorners, useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import toast from 'react-hot-toast';
import { Users, Plus, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import TaskModal from '../components/TaskModal';
import MembersModal from '../components/MembersModal';

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
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [activeTab, setActiveTab] = useState<'board' | 'history'>('board');

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

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['activity', id],
    queryFn: async () => {
      const res = await api.get(`/projects/${id}/activity`);
      return res.data.data;
    },
    enabled: activeTab === 'history',
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
    onError: (_err, _newTodo, context: any) => {
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
          <div className="flex -space-x-2 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsManagingMembers(true)}>
            {project?.members.slice(0, 5).map((member: any) => (
              <div key={member.id} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700" title={member.user.name}>
                {member.user.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {project?.members.length > 5 && (
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                +{project.members.length - 5}
              </div>
            )}
          </div>
          <Button variant="outline" onClick={() => setIsManagingMembers(true)}>
            <Users className="w-4 h-4 mr-2" /> Members
          </Button>
          <Button onClick={() => setIsCreatingTask(true)}><Plus className="w-4 h-4 mr-2" /> Add Task</Button>
        </div>
      </div>

      <div className="mb-6 flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('board')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'board'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Kanban Board
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Activity History
        </button>
      </div>

      {activeTab === 'board' ? (
        <div className="flex-1 overflow-x-auto">
          <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex gap-6 h-full min-h-[500px]">
              {COLUMNS.map((col) => (
                <div key={col.id} className="flex-shrink-0 w-80 bg-slate-100 dark:bg-slate-900/50 rounded-lg flex flex-col">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                      {col.title}
                      <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-0.5 px-2 rounded-full text-xs">
                        {getTasksByStatus(col.id).length}
                      </span>
                    </h3>
                  </div>
                  <div 
                    id={col.id}
                    className="flex-1 p-3 space-y-3 overflow-y-auto"
                  >
                    <DroppableColumn id={col.id} tasks={getTasksByStatus(col.id)} onTaskClick={setSelectedTask} />
                  </div>
                </div>
              ))}
            </div>
          </DndContext>
        </div>
      ) : (
        <div className="flex-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Updates</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {activityLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {activity?.map((log: any) => (
                  <div key={log.id} className="flex gap-4">
                    <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400">
                      {log.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{log.user.name}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {log.action === 'TASK_CREATED' && <span>created task <span className="font-semibold text-primary-600 dark:text-primary-400">{log.meta?.title}</span></span>}
                        {log.action === 'TASK_STATUS_CHANGED' && <span>moved a task from <span className="italic">{log.meta?.oldStatus}</span> to <span className="font-semibold">{log.meta?.newStatus}</span></span>}
                        {log.action === 'PROJECT_UPDATED' && <span>updated the project details</span>}
                        {log.action === 'MEMBER_ADDED' && <span>added a new member to the team</span>}
                        {log.action === 'MEMBER_REMOVED' && <span>removed a member from the team</span>}
                      </p>
                    </div>
                  </div>
                ))}
                {activity?.length === 0 && (
                  <div className="text-center py-12 text-slate-500">No activity yet.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {(selectedTask || isCreatingTask) && (
        <TaskModal 
          taskId={selectedTask} 
          projectId={id!}
          onClose={() => { setSelectedTask(null); setIsCreatingTask(false); }}
          projectMembers={project?.members || []}
          isAdmin={isAdmin}
        />
      )}

      {isManagingMembers && (
        <MembersModal
          projectId={id!}
          onClose={() => setIsManagingMembers(false)}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}

// Simple implementations of Droppable and Draggable for the board

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
      className={`bg-white dark:bg-slate-900 p-4 mb-3 rounded shadow-sm border cursor-grab active:cursor-grabbing hover:border-primary-300 dark:hover:border-primary-500 transition-all ${isOverdue ? 'border-red-300 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-800'}`}
      onClick={() => {
        // Prevent click when dragging
        if (!transform) onClick();
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">{task.title}</h4>
      </div>
      {task.assignedTo && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 flex items-center">
          <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-bold mr-1.5">
            {task.assignedTo.name.charAt(0).toUpperCase()}
          </div>
          {task.assignedTo.name}
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
