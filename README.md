# AgentDNA Docs

The documentation site for AgentDNA, a trust layer for multi-agent AI systems. Built with [Docusaurus](https://docusaurus.io/).

## Local development

```bash
npm install
npm start
```

`npm start` runs a local dev server and opens a browser window. Most edits are reflected live without a restart.

## Build

```bash
npm run build
```

This generates static content into the `build/` directory, ready to be served by any static hosting service. Run `npm run serve` to preview the production build locally.

## Project layout

| Path | What it holds |
| --- | --- |
| `docs/` | The documentation content, grouped into concepts, the SDK guide, examples, and reference. |
| `src/css/palette.css` | The color palette. This is the single source of truth for the site's colors. |
| `src/css/custom.css` | Global styles. Imports the palette; defines no colors of its own. |
| `src/pages/` | The homepage and any standalone pages. |
| `src/components/` | React components used on the homepage. |
| `docusaurus.config.js` | Site configuration: title, navbar, footer, and presets. |
| `sidebars.js` | Sidebar definition, generated from the `docs/` folder structure. |

## Changing the color scheme

All colors live in [`src/css/palette.css`](src/css/palette.css). The brand palette is defined once, under the `--adna-` prefixed variables, and mapped onto the Docusaurus theme variables in the same file. To re-theme the site, edit the `--adna-` values for light mode and dark mode. No other file needs to change.

## Source material

The initial draft was written from [`INITIAL_CONTENT.md`](INITIAL_CONTENT.md), the AgentDNA onboarding guide.
