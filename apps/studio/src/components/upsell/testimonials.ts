export interface Testimonial {
  quote: string
  name: string
  // Only what the customer gave us; left out when the submission has no title.
  title?: string
}

// Verbatim from the website's testimonials export, chosen for what they say
// about paying for a license. Trimmed only at sentence boundaries, never
// spliced. Add more by copying real entries; don't paraphrase or invent titles.
export const TESTIMONIALS: Testimonial[] = [
  {
    quote: 'I started using it a year ago and now our whole team bought a license.',
    name: 'Matt K',
    title: 'Engineering Lead, MinnHealth',
  },
  {
    quote: "It's still very usable in the free version, but worth every cent to buy the premium license.",
    name: 'Renan L Vendramini',
    title: 'Senior Software Engineer at Alboom',
  },
  {
    quote: 'I used to use dbeaver for free, so paying for a db manager was a new step for me. The feature that enticed me to upgrade was the "cloud" storage of my queries.',
    name: 'David Wylie',
    title: 'Director, Telemix Limited',
  },
  {
    quote: 'The new json view for a row of data is a simple but very, very useful feature. Well worth picking up a license for it.',
    name: 'Ryan Vaznis',
  },
  {
    quote: 'It was also worth the upgrade! All of the features you could need are available.',
    name: 'Andrea Armstrong',
  },
  {
    quote: "I like the perpetual licence offer, as I'm trying to recommend to my clients software without ongoing fees where possible.",
    name: 'Luke Bracegirdle',
    title: 'Company Owner, Code Anchor Limited',
  },
  {
    quote: "Test driving Beekeeper Studio's community edition felt great and made it an easy decision to unlock the additional features and support Matthew with an upgraded plan, particularly at the very reasonable price point.",
    name: 'Derek Garnett',
  },
]
