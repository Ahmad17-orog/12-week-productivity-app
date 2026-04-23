/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  dayIndex: number; // 0-6 for Mon-Sun
  weekIndex: number; // 0-11
  quarterIndex: number; // 0-3
  yearIndex: number;
}

export interface StrategicGoal {
  id: string;
  title: string;
  progress: number; // 0-100
  quarterIndex: number; // 0-3
  yearIndex: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  unlockedAt: string | null;
  condition: string;
}

export interface AppData {
  tasks: Task[];
  goals: StrategicGoal[];
  streak: number;
  lastCompletedDate: string | null;
  badges: Badge[];
  currentYear?: number;
  currentQuarter?: number;
}

export interface DailyStats {
  date: string;
  completionRate: number;
}
