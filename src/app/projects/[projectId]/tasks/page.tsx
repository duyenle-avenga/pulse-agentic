import { TasksView } from '@/components/project/tasks/tasks-view'

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ view?: string | string[] }> }) {
  const { view } = await searchParams
  return <TasksView view={view === 'board' ? 'board' : 'list'} />
}
