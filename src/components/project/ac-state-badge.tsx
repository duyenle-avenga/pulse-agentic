import { AC_STATE_COLOR, AC_STATE_LABEL } from '@/components/labels'
import type { AcState } from '@/lib/domain/types'

export function AcStateBadge({ state }: { state: AcState }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
      <span aria-hidden className={`size-2 shrink-0 rounded-full ${AC_STATE_COLOR[state]}`} />
      {AC_STATE_LABEL[state]}
    </span>
  )
}
