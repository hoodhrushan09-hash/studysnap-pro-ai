export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  userId?: string;
  title: string;
  description?: string | null;
  subject: string;
  dueDate: string | null;
  completed: boolean;
  createdAt: number;
  priority?: Priority | null;
  reminderTime?: string | null;
  subtasks?: Subtask[];
  recurring?: 'none' | 'daily' | 'weekly' | null;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
}

export interface Note {
  id: string;
  userId?: string;
  title: string;
  content: string;
  subject: string;
  taskId?: string | null;
  updatedAt: number;
  pinned?: boolean;
  color?: string | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoBase64?: string;
  grade?: string;
  ageGroup?: string;
  bio?: string;
  provider: string;
  onboarded: boolean;
  xp?: number;
  level?: number;
  coins?: number;
  streak?: number;
  updatedAt?: number;
  createdAt: number;
}

export type ViewState = 'dashboard' | 'tasks' | 'calendar' | 'notes' | 'focus' | 'search';
