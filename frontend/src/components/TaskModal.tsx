import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTaskSchema, updateTaskSchema } from '@ethara/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import toast from 'react-hot-toast';
import { X, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function TaskModal({ 
  taskId, 
  projectId, 
  onClose, 
  projectMembers,
  isAdmin 
}: { 
  taskId: string | null; 
  projectId: string; 
  onClose: () => void; 
  projectMembers: any[];
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isEditing = !!taskId;

  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) return null;
      // In a real app we'd fetch specific task details or get from cache
      const tasks = queryClient.getQueryData(['tasks', projectId]) as any[];
      return tasks?.find(t => t.id === taskId);
    },
    enabled: !!taskId,
  });

  const { data: comments } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}/tasks/${taskId}/comments`);
      return res.data.data;
    },
    enabled: !!taskId,
  });

  const schema = isEditing ? updateTaskSchema : createTaskSchema;
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      status: 'TODO',
      priority: 'MEDIUM',
      assignedToId: null,
      dueDate: '',
    }
  });

  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assignedToId: task.assignedToId,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      });
    }
  }, [task, reset]);

  const saveTask = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        return api.patch(`/projects/${projectId}/tasks/${taskId}`, data);
      } else {
        return api.post(`/projects/${projectId}/tasks`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success(`Task ${isEditing ? 'updated' : 'created'}`);
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to save task');
    }
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      return api.post(`/projects/${projectId}/tasks/${taskId}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      toast.success('Comment added');
    }
  });

  const deleteTask = useMutation({
    mutationFn: async () => {
      return api.delete(`/projects/${projectId}/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success('Task deleted');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete task');
    }
  });

  const onSubmit = (data: any) => {
    // Convert empty string back to null for dueDate and assignedToId
    const formattedData = {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      assignedToId: data.assignedToId === '' ? null : data.assignedToId,
    };
    saveTask.mutate(formattedData);
  };

  const handleCommentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const content = formData.get('content') as string;
    if (content.trim()) {
      addComment.mutate(content);
      e.currentTarget.reset();
    }
  };

  const canEdit = !isEditing || isAdmin || task?.assignedToId === user?.id || task?.createdById === user?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">{isEditing ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {taskLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-slate-200 rounded w-full"></div>
              <div className="h-24 bg-slate-200 rounded w-full"></div>
            </div>
          ) : (
            <form id="task-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <Input {...register('title')} disabled={!canEdit} />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea 
                  {...register('description')} 
                  disabled={!canEdit}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select {...register('status')} disabled={!canEdit} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                  <select {...register('priority')} disabled={!canEdit} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assignee</label>
                  <select {...register('assignedToId')} disabled={!canEdit} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                    <option value="">Unassigned</option>
                    {projectMembers.map(m => (
                      <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                  <Input type="date" {...register('dueDate')} disabled={!canEdit} />
                </div>
              </div>
            </form>
          )}

          {isEditing && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h3 className="text-lg font-medium text-slate-900 mb-4">Comments</h3>
              <div className="space-y-4 mb-4">
                {comments?.map((comment: any) => (
                  <div key={comment.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-slate-800">{comment.author.name}</span>
                      <span className="text-xs text-slate-500">{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-700">{comment.content}</p>
                  </div>
                ))}
                {comments?.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}
              </div>

              <form onSubmit={handleCommentSubmit} className="flex gap-2">
                <Input name="content" placeholder="Add a comment..." className="flex-1" />
                <Button type="submit" disabled={addComment.isPending}>Send</Button>
              </form>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-between gap-2 bg-slate-50 rounded-b-xl">
          <div>
            {isEditing && canEdit && (
              <Button 
                type="button" 
                variant="outline" 
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this task?')) {
                    deleteTask.mutate();
                  }
                }}
                disabled={deleteTask.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            {canEdit && (
              <Button type="submit" form="task-form" disabled={saveTask.isPending || isSubmitting}>
                {saveTask.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
