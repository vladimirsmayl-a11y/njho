export type Tier = 'none' | 'standard' | 'pro' | 'premium';

export interface Me {
  id: number;
  username: string;
  email: string | null;
  avatar_url: string | null;
  tier: Tier;
  subscription_status: 'active' | 'inactive';
  has_access: boolean;
  is_admin: boolean;
  has_custom_password: boolean;
}

export interface Habit { id: number; title: string; done: boolean; streak: number }
export interface TaskItem { id: number; title: string; done: boolean }
export interface Post { id: number; title: string; body: string; created_at: string }

export interface Dashboard {
  streak: number;
  best_streak: number;
  habits_total: number;
  habits_done: number;
  percent: number;
  week: { date: string; done: number; total: number; percent: number }[];
  tasks_total: number;
  tasks_done: number;
  active_marathons: number;
  posts: Post[];
}

export interface JournalEntry { id: number; title: string; content: string; created_at: string; updated_at: string }

export type MarathonStatus = 'upcoming' | 'active' | 'finished';
export interface MarathonListItem {
  id: number; title: string; description: string; starts_on: string; ends_on: string;
  premium_only: boolean; status: MarathonStatus; joined: boolean; tasks_total: number; reports_done: number;
}
export interface MarathonDetail extends Omit<MarathonListItem, 'tasks_total' | 'reports_done'> {
  tasks: { id: number; title: string; description: string; due_on: string | null; report: string | null }[];
}

export interface AdminUser {
  id: number; telegram_id: number; telegram_username: string | null; username: string; email: string | null;
  tier: Tier; subscription_status: 'active' | 'inactive'; tier_locked: boolean; is_admin: boolean; is_blocked: boolean;
  has_access: boolean; created_at: string;
}
export interface AdminPost extends Post { sent_to_telegram: boolean; sent_count: number }
export interface AdminMarathon {
  id: number; title: string; description: string; starts_on: string; ends_on: string;
  premium_only: boolean; is_published: boolean;
  tasks: { id: number; title: string; description: string; due_on: string | null; position: number }[];
}
export interface AdminReport { id: number; username: string; task: string; text: string; created_at: string }
