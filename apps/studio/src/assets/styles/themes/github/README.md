# GitHub theme

Colours come from GitHub's Primer design system, `@primer/primitives`
(`src/tokens/base/color/light/light.json5` and `dark/dark.json5`).
The same scales are rendered in the Primer storybook:

- Light: https://primer.style/primitives/storybook/?path=/story/color-base-display-scales--all-scales
- Dark: https://primer.style/primitives/storybook/?path=/story/color-base-display-scales--all-scales&globals=theme:dark

`manifest.json` holds one seed per hue; the full 12-step scales are generated
from these seeds at runtime.

| Seed         | Light (`base`)         | Dark (`baseDark`)       |
| ------------ | ---------------------- | ----------------------- |
| `background` | `base.color.white`     | `base.color.neutral.1`  |
| `gray`       | `base.color.black`     | `base.color.neutral.12` |
| `blue`       | `base.color.blue.5`    | `base.color.blue.5`     |
| `green`      | `base.color.green.5`   | `base.color.green.5`    |
| `yellow`     | `base.color.yellow.5`  | `base.color.yellow.5`   |
| `orange`     | `base.color.orange.5`  | `base.color.orange.5`   |
| `red`        | `base.color.red.5`     | `base.color.red.5`      |
| `purple`     | `base.color.purple.5`  | `base.color.purple.5`   |
| `pink`       | `base.color.pink.5`    | `base.color.pink.5`     |

Step 5 is the step Primer uses for emphasis backgrounds (`bgColor-*-emphasis`),
so it lands on step 9 of the generated scale.
