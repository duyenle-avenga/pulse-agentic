export function DeliveryBar({ completionPct, deliveryPct }: { completionPct: number; deliveryPct: number }) {
  const label = `Completion ${completionPct}% · Delivery ${deliveryPct}%`
  return (
    <div className="space-y-1">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={label}>
        <div className="absolute inset-y-0 left-0 bg-(--ac-implemented)" style={{ width: `${deliveryPct}%` }} />
        <div className="absolute inset-y-0 left-0 bg-(--ac-verified)" style={{ width: `${completionPct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
