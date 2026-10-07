'use client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { buildUrl } from '@/lib/utils';

export type TChatExecutionItem = {
  id: number;
  resident?: any
};

export type TChatExecution = {
  id: number;
  method: string;
  payload: any;
  created_at: string;
  chat_id: number;
  chatExecutionHistoryItems: TChatExecutionItem[];
};

export type TChat = {
  id: number;
  user_id: number;
  role: 'assistant' | 'user';
  content: string;
  reasoning?: string;
  created_at: string;
  chatExecutionHistories: TChatExecution[];
};

const useChatHistory = () => {

  const {
    data: response,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['chat-history'],
    queryFn: async () => {
      const res = await fetch(buildUrl('/api/chat'))
      return await res.json() as { data: TChat[] }
    },
  });

  if (error) {
    console.error(error);
    toast.error('Server Error');
  }

  return {
    data: response?.data ?? [],
    error,
    isLoading,
    refetch,
  };
};

export default useChatHistory;