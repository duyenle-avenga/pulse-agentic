import type { ProjectData } from '@/lib/domain/types'
import { expenseTracker } from './project-a'
import { customerPortal } from './project-b'
import { intelligentFlow } from './project-c'

export const ALL_PROJECTS: ProjectData[] = [expenseTracker, customerPortal, intelligentFlow]
