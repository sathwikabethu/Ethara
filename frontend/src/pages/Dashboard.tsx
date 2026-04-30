import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import { Clock, CheckCircle2, ListTodo, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuthStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const response = await api.get('/dashboard');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-64 bg-slate-200 rounded-lg"></div>
          <div className="h-64 bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const cards = [
    { name: 'Total Tasks', stat: stats?.statusCounts.TODO + stats?.statusCounts.IN_PROGRESS + stats?.statusCounts.IN_REVIEW, icon: ListTodo, color: 'text-blue-500', bg: 'bg-blue-100' },
    { name: 'Overdue', stat: stats?.overdueCount, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100' },
    { name: 'Due This Week', stat: stats?.tasksDueThisWeek.length, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-100' },
    { name: 'Done This Week', stat: stats?.doneThisWeekCount, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Here's what's happening across your projects.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.name} className="bg-white overflow-hidden shadow-sm rounded-lg border border-slate-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${card.bg}`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 truncate">{card.name}</dt>
                    <dd>
                      <div className="text-2xl font-bold text-slate-900">{card.stat}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tasks Due This Week */}
        <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-slate-200">
            <h3 className="text-lg leading-6 font-medium text-slate-900">Tasks Due This Week</h3>
          </div>
          <ul className="divide-y divide-slate-200 h-96 overflow-y-auto">
            {stats?.tasksDueThisWeek.length === 0 ? (
              <li className="p-6 text-center text-slate-500">No tasks due this week!</li>
            ) : (
              stats?.tasksDueThisWeek.map((task: any) => (
                <li key={task.id} className="px-4 py-4 sm:px-6 hover:bg-slate-50 transition-colors">
                  <Link to={`/projects/${task.projectId}`} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary-600 truncate">{task.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{task.project.name}</p>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex flex-col items-end">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${new Date(task.dueDate) < new Date() ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-slate-200">
            <h3 className="text-lg leading-6 font-medium text-slate-900">Recent Activity</h3>
          </div>
          <ul className="divide-y divide-slate-200 h-96 overflow-y-auto">
            {stats?.recentActivity.length === 0 ? (
              <li className="p-6 text-center text-slate-500">No recent activity.</li>
            ) : (
              stats?.recentActivity.map((log: any) => (
                <li key={log.id} className="px-4 py-4 sm:px-6">
                  <div className="flex space-x-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-slate-900">{log.user.name}</h3>
                        <p className="text-sm text-slate-500">{new Date(log.createdAt).toLocaleDateString()}</p>
                      </div>
                      <p className="text-sm text-slate-500">
                        {log.action === 'TASK_CREATED' && `created task in ${log.project.name}`}
                        {log.action === 'TASK_STATUS_CHANGED' && `moved a task from ${log.meta?.oldStatus} to ${log.meta?.newStatus} in ${log.project.name}`}
                        {log.action === 'PROJECT_CREATED' && `created project ${log.project.name}`}
                        {log.action === 'MEMBER_ADDED' && `added a member to ${log.project.name}`}
                      </p>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
