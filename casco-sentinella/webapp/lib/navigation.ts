import {
  FolderKanbanIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  ShieldCheckIcon,
  SquareCheckBigIcon,
  SparklesIcon,
  LifeBuoyIcon,
} from 'lucide-react'

/** One entry per feature. The shell shows the entries the user holds at least `read` on. */
export type NavEntry = {
  key: string
  title: string
  href: string
  icon: LucideIcon
}

export const NAVIGATION: readonly NavEntry[] = [
  { key: 'dashboard', title: 'Dashboard', href: '/dashboard', icon: LayoutDashboardIcon },
  { key: 'tasks', title: 'Task', href: '/tasks', icon: SquareCheckBigIcon },
  { key: 'help_desk', title: 'Help desk', href: '/help-desk', icon: LifeBuoyIcon },
  { key: 'projects', title: 'Commesse', href: '/projects', icon: FolderKanbanIcon },
  { key: 'ai', title: 'Assistente', href: '/assistant', icon: SparklesIcon },
  { key: 'access', title: 'Accessi', href: '/access', icon: ShieldCheckIcon },
]

/** The entry a pathname belongs to (`/tasks/123` → tasks). */
export function navEntryFor(pathname: string) {
  return NAVIGATION.find(entry => pathname === entry.href || pathname.startsWith(`${entry.href}/`)) ?? null
}
