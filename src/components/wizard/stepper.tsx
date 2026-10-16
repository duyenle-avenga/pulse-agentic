const STEPS = ['Describe', 'Clarifying questions', 'Review scope', 'v1 locked'] as const

export function Stepper({ current }: { current: number }) {
  return (
    <ol aria-label="Wizard steps" className="flex flex-wrap gap-2 text-sm">
      {STEPS.map((label, i) => (
        <li
          key={label}
          aria-current={i === current ? 'step' : undefined}
          className={
            i === current
              ? 'rounded-full border border-primary bg-primary px-3 py-1 text-primary-foreground'
              : `rounded-full border px-3 py-1 ${i < current ? 'text-foreground' : 'text-muted-foreground'}`
          }
        >
          {`${i + 1}. ${label}`}
        </li>
      ))}
    </ol>
  )
}
