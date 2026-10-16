import Link from 'next/link'
import { ProjectBadges } from '@/components/project-badges'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { PortfolioRow } from '@/lib/data'
import type { IsoDateTime } from '@/lib/domain/types'
import { formatRelative } from '@/lib/format'
import { DeliveryBar } from './delivery-bar'

export function ProjectsTable({ rows, now }: { rows: PortfolioRow[]; now: IsoDateTime }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Scope</TableHead>
          <TableHead className="w-56">Progress</TableHead>
          <TableHead className="text-right">ACs verified</TableHead>
          <TableHead className="text-right">Signals</TableHead>
          <TableHead className="text-right">Approvals</TableHead>
          <TableHead className="text-right">User testing</TableHead>
          <TableHead>Last activity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground">
              No projects yet.
            </TableCell>
          </TableRow>
        )}
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="space-y-1">
              <Link href={`/projects/${r.id}`} className="font-medium hover:underline">
                {r.name}
              </Link>
              <ProjectBadges kind={r.kind} board={r.board} boardKey={r.boardKey} />
            </TableCell>
            <TableCell>{r.scopeLabel}</TableCell>
            <TableCell>
              <DeliveryBar completionPct={r.completionPct} deliveryPct={r.deliveryPct} />
            </TableCell>
            <TableCell className="text-right tabular-nums">{`${r.verified} / ${r.total}`}</TableCell>
            <TableCell className="text-right tabular-nums">
              {r.openSignals}
              {r.highSignals > 0 && (
                <Badge variant="destructive" className="ml-2">{`${r.highSignals} high`}</Badge>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">{r.pendingApprovals}</TableCell>
            <TableCell className="text-right tabular-nums">{r.pendingUserTesting}</TableCell>
            <TableCell className="text-muted-foreground">
              {r.lastActivityAt ? formatRelative(r.lastActivityAt, now) : 'None yet'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
