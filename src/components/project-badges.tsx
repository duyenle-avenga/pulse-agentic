import { Badge } from '@/components/ui/badge'
import type { BoardKind, ProjectKind } from '@/lib/domain/types'
import { BOARD_LABEL, KIND_LABEL } from './labels'

export function ProjectBadges({ kind, board, boardKey }: { kind: ProjectKind; board: BoardKind; boardKey?: string }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Badge variant="secondary">{KIND_LABEL[kind]}</Badge>
      <Badge variant="outline">{boardKey ? `${BOARD_LABEL[board]} ${boardKey}` : BOARD_LABEL[board]}</Badge>
    </div>
  )
}
