import type { ProjectData } from '@/lib/domain/types'
import { expenseTracker } from './project-a'
import { customerPortal } from './project-b'

export const ALL_PROJECTS: ProjectData[] = [expenseTracker, customerPortal]
