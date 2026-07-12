/** Central route table so navigation strings live in one place. */
export const routes = {
  login: '/',
  dashboard: '/dashboard',
  medications: '/medications',
  appointments: '/appointments',
  healthLog: '/healthlog',
  messages: '/messages',
  emergency: '/emergency',
  profile: '/profile',
  settings: '/settings',
} as const;
