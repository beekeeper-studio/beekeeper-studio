/**
 * Builds the "ask your team to buy it" text.
 *
 * Most Beekeeper users at a company can't put a card down without approval,
 * so the app hands them a ready-to-paste request instead of a pricing page.
 * Everything in here is plain facts a manager needs to say yes: what it is,
 * what it costs, how to buy, and the security posture.
 */

export type PlanId = 'indie' | 'professional' | 'business'

export interface Plan {
  id: PlanId
  name: string
  /** Per user per month when billed yearly (USD). */
  yearlyPerMonth: number
  /** Per user per month when billed monthly (USD). */
  monthly: number
  /** Seat cap, when the plan has one. */
  maxSeats?: number
  /** One line for a select box or plan summary. */
  summary: string
}

// List prices. These mirror the website; when the site changes, change them
// here too: web/_data/pricing.yml. The generated text always links to the
// live pricing page so a stale number here is never the last word.
export const PLANS: Plan[] = [
  {
    id: 'indie',
    name: 'Indie',
    yearlyPerMonth: 9,
    monthly: 18,
    maxSeats: 2,
    summary: 'Up to 2 seats, one computer per person',
  },
  {
    id: 'professional',
    name: 'Professional',
    yearlyPerMonth: 14,
    monthly: 28,
    maxSeats: 10,
    summary: 'All features, any number of computers, email support',
  },
  {
    id: 'business',
    name: 'Business',
    yearlyPerMonth: 18,
    monthly: 35,
    summary: 'Professional, plus SSO database auth, air-gapped licensing, and invoicing',
  },
]

export const DEFAULT_PLAN_ID: PlanId = 'professional'

export const PRICING_URL = 'https://www.beekeeperstudio.io/pricing'
export const QUOTE_URL = 'https://app.beekeeperstudio.io/quotes/new'
export const SECURITY_URL = 'https://www.beekeeperstudio.io/security'
export const WEBSITE_URL = 'https://www.beekeeperstudio.io'
export const SALES_EMAIL = 'sales@beekeeperstudio.io'
export const LIFETIME_DOCS_URL = 'https://docs.beekeeperstudio.io/purchasing/purchasing-a-license/#lifetime-access'

export function planById(id: string | null | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS.find((p) => p.id === DEFAULT_PLAN_ID)
}

/** Smallest plan whose seat cap fits `seats`, preferring the default plan. */
export function recommendedPlan(seats: number): Plan {
  const preferred = planById(DEFAULT_PLAN_ID)
  if (!preferred.maxSeats || seats <= preferred.maxSeats) return preferred
  return PLANS.find((p) => !p.maxSeats || seats <= p.maxSeats) ?? PLANS[PLANS.length - 1]
}

export interface PurchaseRequestOptions {
  plan: Plan
  seats: number
  /** Display labels of paid features used during the trial, if any. */
  usedFeatures?: string[]
  /** Whether the user has been through the trial already. */
  trialed?: boolean
}

function usd(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('')
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

export function requestSubject(plan: Plan, seats: number): string {
  const seatText = seats === 1 ? '1 seat' : `${seats} seats`
  return `Software license request: Beekeeper Studio (${plan.name}, ${seatText})`
}

/**
 * The request body, ready to paste into email or chat. Plain text, short
 * sections, no marketing voice: it reads as the engineer's own note.
 */
export function buildPurchaseRequest(options: PurchaseRequestOptions): string {
  const { plan, usedFeatures = [], trialed = false } = options
  const seats = Math.max(1, Math.floor(options.seats || 1))
  const perYear = plan.yearlyPerMonth * 12
  const total = perYear * seats
  const seatText = seats === 1 ? '1 seat' : `${seats} seats`

  const why = usedFeatures.length
    ? `I trialed the paid version for 14 days. The features I relied on: ${joinNames(usedFeatures)}.`
    : trialed
      ? 'I trialed the paid version for 14 days and want to keep using it.'
      : 'The free version covers basic querying. The paid version adds import/export, a JSON row viewer, editable query results, an AI shell that uses our own model key, and 10+ more database engines.'

  const lines = [
    `Subject: ${requestSubject(plan, seats)}`,
    '',
    'Hi,',
    '',
    `I'd like to buy a Beekeeper Studio license. It's the SQL client I use for our database work (PostgreSQL, MySQL, SQL Server, SQLite, and others). ${WEBSITE_URL}`,
    '',
    'Why the paid version',
    why,
    '',
    'Cost',
    `- ${plan.name} plan: ${usd(plan.yearlyPerMonth)} per user per month billed yearly (${usd(perYear)} per user per year), or ${usd(plan.monthly)} per user per month billed monthly.`,
    `- ${seatText}: ${usd(total)} per year.`,
    '- Paying for 12 months grants a lifetime license for every version released in that period, so the software keeps working if we stop paying.',
    '- 30-day money-back guarantee.',
    `- Current list prices: ${PRICING_URL}`,
    '',
    'Buying',
    '- Card checkout on the pricing page. The license key arrives by email and is entered in the app.',
    `- Formal quote (PDF) or invoice: ${QUOTE_URL} or ${SALES_EMAIL}`,
    '- Licenses are per person: one seat for each user.',
    '',
    'Security',
    '- Desktop app that connects directly to our databases. Query data never passes through the vendor.',
    '- No telemetry by default. The core is open source (GPLv3) and the paid modules are source-available on GitHub.',
    `- ${SECURITY_URL}`,
    '',
    'Thanks',
  ]

  return lines.join('\n')
}
