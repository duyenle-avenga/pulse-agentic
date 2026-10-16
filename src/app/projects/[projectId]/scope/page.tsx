import { ScopeView } from '@/components/project/scope/scope-view'

export default async function ScopePage({ searchParams }: { searchParams: Promise<{ from?: string | string[]; to?: string | string[] }> }) {
  const { from, to } = await searchParams
  return <ScopeView from={typeof from === 'string' ? from : undefined} to={typeof to === 'string' ? to : undefined} />
}
