import type { Appointment, MessagePreview, StatCard } from '@/models/types';

/**
 * Static mock data for the dashboard's secondary widgets. Per the agreed
 * scope only Medications is wired to live state; these render the Figma's
 * stat cards, schedule, and message preview from fixed values.
 */

export const dashboardDateLine = 'Thursday, May 28 · 2 of 3 medications taken today';

export const statCards: readonly StatCard[] = [
  { label: 'PAIN LEVEL', value: '6/10', hint: '↑ Up from yesterday', tone: 'amber' },
  { label: 'MEDS TODAY', value: '2/3', hint: '1 remaining', tone: 'teal' },
  { label: 'SLEEP', value: '6.5h', hint: 'Goal: 8h', tone: 'neutral' },
];

export const todaysSchedule: readonly Appointment[] = [
  {
    id: 'pt',
    title: 'Physical Therapy',
    detail: '2:00 PM · UMGC Medical',
    badge: 'SOON',
    badgeTone: 'soon',
  },
  {
    id: 'vitamin-b6',
    title: 'Vitamin B6',
    detail: '9:00 PM · Daily',
    badge: 'LATER',
    badgeTone: 'later',
  },
];

export const messagePreviews: readonly MessagePreview[] = [
  {
    id: 'dr-park',
    from: 'Dr. Park',
    preview: 'Please bring your symptom log.',
    unread: true,
  },
  {
    id: 'nurse',
    from: 'Nurse',
    preview: 'Great progress this week!',
    unread: false,
  },
];
