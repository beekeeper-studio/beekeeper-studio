// Starter demo: copy this folder, rename it, and replace the scenes.
// Needs no database. From apps/studio:
//
//   node e2e/demos/_template/record.mjs                    -> out/beekeeper-template-demo.mp4
//   NO_RECORD=1 SHOTS=1 node e2e/demos/_template/record.mjs   (dry run, screenshots only)
import { runDemo, here, card, prepareProfile, postgresConnection } from '../lib/index.mjs'

const K = 'Template'

await runDemo({
  name: 'beekeeper-template-demo',
  outDir: here(import.meta.url, 'out'),
  // setup: () => reseed(pg, { databases: ['app'], seedFile: here(import.meta.url, 'seed.sql') }),
  prepare: ({ page }) => prepareProfile(page, {
    connections: [postgresConnection({ name: 'Example — PRODUCTION', database: 'app', color: 'red', user: 'demo', password: 'demo' })],
  }),
  title: card({
    logo: true,
    eyebrow: 'Beekeeper Studio',
    title: 'Demo title goes here',
    text: 'One sentence on what the viewer will learn.',
  }),
  scenes: [
    async ({ d }) => {
      d.mark('intro')
      await d.wait(3000)
    },
    async ({ d, page }) => {
      d.mark('tour')
      await d.hideCard()
      const item = page.locator('.list-item', { hasText: 'Example — PRODUCTION' }).first()
      await d.spotlight(item, 4, { dim: true })
      await d.caption('Spotlights point at things. Captions say what is going on.', K, 3200)
      await d.clearSpotlights()
      await d.caption('Clicks are circled, or boxed when the target is wide.', K)
      await d.click(item)
      await d.wait(1200)
      const test = page.getByRole('button', { name: 'Test', exact: true })
      const m = await d.markOn(test, 'circle')
      await d.caption('markOn() circles something without clicking it.', K, 2600)
      await d.unmark(m)
      await d.caption('Typing into a field boxes it.', K)
      await d.typeInto(page.getByPlaceholder('Filter').first(), 'production')
      await d.wait(1200)
      await d.hideCaption()
    },
    async ({ d }) => {
      d.mark('recap')
      await d.card(card({
        logo: true,
        eyebrow: 'Beekeeper Studio',
        title: 'Recap',
        bullets: ['First takeaway', 'Second takeaway'],
        footer: 'beekeeperstudio.io',
      }), 3000)
    },
  ],
  chapters: { intro: 'Intro', tour: 'Overlay tour', recap: 'Recap' },
})
