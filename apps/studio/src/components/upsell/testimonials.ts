export interface Testimonial {
  quote: string
  name: string
  title: string
}

// Verbatim from the website's testimonials export. Trimmed only at a sentence
// boundary, never spliced. Add more by copying real entries; don't paraphrase.
export const TESTIMONIALS: Testimonial[] = [
  {
    quote: 'Beekeeper is the best database client I have ever used, in my 20+ years of professional coding.',
    name: 'Daniel Morris',
    title: 'CTO, Cubitts',
  },
  {
    quote: 'Beekeeper Studio is by far the best db ui tool we have come across. Dependable, intuitive to use, not fussy, and very pleasant to look at.',
    name: 'Brandon Veiseh',
    title: 'CEO @ MindFort AI (YC X25)',
  },
  {
    quote: 'I love it. Knocks spots off PGAdmin. Fast, easy to use, and powerful.',
    name: 'Mark Anslow',
    title: 'CTO, Scriba Technologies Ltd',
  },
  {
    quote: "Beekeeper Studio is simple, blazing fast and just 'gets out of the way'.",
    name: 'Suki Parwana',
    title: 'CTO, Croftz Technologies',
  },
  {
    quote: 'Such an awesome product. Beautiful UI, everything works the way it should, great database/sql command exports.',
    name: 'Hadi Fariborzi',
    title: 'CEO and Cofounder, HubMeta',
  },
  {
    quote: 'It just works, no fuss at all. Imports and exports, especially, work flawlessly.',
    name: 'Nahabi Wandera',
    title: 'Technologist, The TG Foundry',
  },
]
