import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Link } from 'react-router-dom';
import { FolderKanban, Plus, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema, type CreateProjectInput } from '@ethara/shared';
import toast from 'react-hot-toast';

export default function Projects() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get('/projects');
      return response.data.data;
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
  });

  const createProject = useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      const response = await api.post('/projects', data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreating(false);
      reset();
      toast.success('Project created successfully');
    },
    onError: () => {
      toast.error('Failed to create project');
    },
  });

  const onSubmit = (data: CreateProjectInput) => {
    createProject.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Projects</h1>
        <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Project
        </Button>
      </div>

      {isCreating && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
          <h2 className="text-lg font-medium mb-4 text-slate-900 dark:text-white">Create New Project</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Project Name</label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <Input id="description" {...register('description')} className="dark:bg-slate-800 dark:border-slate-700" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>Create</Button>
              <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {projects?.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 border-dashed">
          <FolderKanban className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-white">No projects</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Get started by creating a new project.</p>
          <div className="mt-6">
            <Button onClick={() => setIsCreating(true)}><Plus className="w-4 h-4 mr-2" /> New Project</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project: any) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="bg-white dark:bg-slate-900 overflow-hidden shadow-sm rounded-lg border border-slate-200 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 transition-all duration-200 group relative hover:shadow-md"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{project.name}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                    {project._count.tasks} Tasks
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2 h-10">
                  {project.description || 'No description provided.'}
                </p>
                <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                  <div className="flex items-center">
                    <Users className="flex-shrink-0 mr-1.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                    <span>{project._count.members} Members</span>
                  </div>
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
