import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X, UserPlus, UserMinus, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

interface Member {
  id: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export default function MembersModal({ 
  projectId, 
  onClose,
  isAdmin 
}: { 
  projectId: string; 
  onClose: () => void;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const [email, setEmail] = useState('');

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ['projectMembers', projectId],
    queryFn: async () => {
      const res = await api.get(`/projects/${projectId}`);
      return res.data.data.members;
    },
  });

  const addMember = useMutation({
    mutationFn: async (email: string) => {
      return api.post(`/projects/${projectId}/members`, { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Member added successfully');
      setEmail('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to add member');
    }
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      return api.delete(`/projects/${projectId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectMembers', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Member removed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    }
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      addMember.mutate(email.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Project Members</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {isAdmin && (
            <form onSubmit={handleAddMember} className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">Add Member by Email</label>
              <div className="flex gap-2">
                <Input 
                  type="email" 
                  placeholder="colleague@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={addMember.isPending}>
                  <UserPlus className="w-4 h-4 mr-2" /> Add
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Members</h3>
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded-lg"></div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {members?.map((member) => (
                  <div key={member.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                        {member.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 flex items-center gap-1">
                          {member.user.name}
                          {member.role === 'ADMIN' && (
                            <Shield className="w-3 h-3 text-amber-500" />
                          )}
                          {member.userId === currentUser?.id && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded ml-1">You</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{member.user.email}</div>
                      </div>
                    </div>
                    
                    {isAdmin && member.userId !== currentUser?.id && (
                      <button 
                        onClick={() => removeMember.mutate(member.userId)}
                        disabled={removeMember.isPending}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50 rounded-b-xl">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
