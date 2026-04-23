/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Badge } from './types';

export const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const INITIAL_BADGES: Badge[] = [
  {
    id: 'disciplined',
    name: 'Disciplined',
    icon: 'ShieldCheck',
    unlockedAt: null,
    condition: 'Complete 5 consecutive days',
  },
  {
    id: 'starter',
    name: 'Quick Starter',
    icon: 'Zap',
    unlockedAt: null,
    condition: 'Complete your first task',
  },
  {
    id: 'finisher',
    name: 'Goal Getter',
    icon: 'Trophy',
    unlockedAt: null,
    condition: 'Reach 100% on a strategic goal',
  }
];

export const AI_MESSAGES = {
  low: [
    "Every journey starts with a single step. Let's get moving!",
    "Progress is progress, no matter how small. Focus on one task.",
    "Don't look at the whole week, just look at today.",
  ],
  medium: [
    "You're in the flow! Keep that momentum going.",
    "Great work so far. You're halfway to excellence.",
    "The 12-week year is built on days like this. Stay steady.",
  ],
  high: [
    "Absolute legend! You're crushing your objectives.",
    "Execution is everything, and you're proving it today.",
    "Unstoppable. The finish line is just a victory lap now.",
  ],
};
