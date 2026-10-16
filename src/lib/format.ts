import type { IsoDateTime } from '@/lib/domain/types'

const TIME_ZONE = 'Europe/Berlin'
// Our own month names: en-GB ICU data prints "Sept" for September.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function berlinParts(at: IsoDateTime) {
  const parts = partsFormatter.formatToParts(new Date(at))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return { year: get('year'), month: Number(get('month')), day: Number(get('day')), time: `${get('hour')}:${get('minute')}` }
}

/** "22 Sep" */
export function formatDate(at: IsoDateTime): string {
  const p = berlinParts(at)
  return `${p.day} ${MONTHS[p.month - 1]}`
}

/** "16 Oct 2026, 09:00" */
export function formatDateTime(at: IsoDateTime): string {
  const p = berlinParts(at)
  return `${p.day} ${MONTHS[p.month - 1]} ${p.year}, ${p.time}`
}

/** "25 min", "3 h", "4 d" */
export function formatDuration(since: IsoDateTime, now: IsoDateTime): string {
  const minutes = Math.max(0, Math.floor((Date.parse(now) - Date.parse(since)) / 60_000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours} h`
  return `${Math.floor(hours / 24)} d`
}

/** "3 h ago", "just now" */
export function formatRelative(at: IsoDateTime, now: IsoDateTime): string {
  const duration = formatDuration(at, now)
  return duration === '0 min' ? 'just now' : `${duration} ago`
}
