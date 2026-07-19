# Design System — Editorial Chess Instrument

Figma contract: [Redesign contract — desktop, mobile, Academy, lobby and tokens](https://www.figma.com/design/R6UrlElyPpXxYlcx18Kwte)

Implemented reference frames: Home/Desktop, Quantum game/Desktop,
Quantum game/Mobile, Academy/Desktop, Online lobby/Desktop and Tokens/components.

## Scene and register

A player sits close to a laptop or phone in a quiet room, concentrating on a
position. The interface should recede around the board, keep secondary information
readable in low ambient light and make quantum events feel exceptional rather than noisy.

This is product UI. Familiar controls, predictable state and information hierarchy
take priority over decorative novelty.

## Visual language

- **Graphite** carries the product shell and inspector surfaces.
- **Ivory** is the principal text and light board material.
- **Brass** is exclusive to classic chess and primary classic actions.
- **Electric violet** is exclusive to quantum selection, branches and measurement.
- **Cyan** identifies merge/entanglement; red is reserved for destructive or losing states.
- Color is always paired with text, shape, icon or pattern.

Dark theme starts with `#0b0c10`, `#12141a`, `#1b1e26`, `#f2f0ea`,
`#b8bbc4`, `#9297a3`, `#2a2e38`, `#d4b44c`, `#8b84ff` and `#56d6d0`.
Light theme starts with `#f7f7f5`, `#ffffff`, `#eceef1`, `#191b20`,
`#4b505a`, `#626875`, `#d9dce2`, `#765b00`, `#554cc7` and `#006e6b`.
Tokens may only move toward greater contrast during implementation.

## Brand mark

The selected mark is concept F: a dotted queen in superposition, a central
measurement axis and the resulting solid queen. The dark version pairs electric
violet with brass; the light version keeps violet for the quantum state and uses
graphite for the measured state, with a restrained brass measurement axis.

- Keep the mark horizontal and preserve its clear space; do not place it inside a chessboard tile.
- Use the live SVG component in product UI so it follows the selected app theme.
- Use `gambito-quantum-mark-dark.svg` and `gambito-quantum-mark-light.svg` for external exports.
- Below 44 px wide, prefer the adaptive favicon rather than compressing the full mark further.

## Typography

- Geist Sans: wordmark, editorial titles, controls, labels and body copy.
- Geist Mono: clocks, room codes, probabilities and notation only.
- Both families are self-hosted from Vercel's official `geist` package.
- Fixed product scale: 13, 15, 17, 20, 24, 32 and 44 px.
- Body copy is limited to 70 characters per line; headings use balanced wrapping.

## Shape, depth and spacing

- Controls use 8 px radius; panels use 12 px; pills are reserved for compact status.
- Prefer a border or a compact shadow, never both as decoration.
- Spacing follows 4, 8, 12, 16, 24, 32 and 48 px.
- The board is the visual anchor. Empty space must support focus, not expose missing layout.
- Repeated card grids, decorative chessboard backgrounds and glass surfaces are prohibited.

## Application anatomy

### Home

The home surface is a 55/45 editorial composition on wide screens and a single
column on mobile. `Play quantum` is the primary route, followed by Classic, Online
and Academy. Match setup expands progressively; advanced options remain collapsed.

### Game

- Desktop: contextual quantum rail, board stage and tabbed inspector.
- Classic desktop: the rail collapses and the board remains centered against the inspector.
- Mobile: 48 px header, player bar, board, contextual controls and a bottom toolbar.
- History and analysis use a bottom sheet on mobile, not permanent squeezed columns.

### Quantum state

Branches retain at least 75% piece opacity and show an explicit percentage badge.
Selected fragments share a recognisable outline. Split targets are numbered; merge
targets use a cyan joining mark; entanglement uses a restrained connector. Capture
preview names attacker, defender and effective outcomes before commitment.

### Measurement

The board remains visible behind a focused measurement sheet. The sequence states
what is measured, the probability and the consequence. Motion may last up to 1.2 s
for this earned moment; reduced motion resolves immediately. A 15 s online timeout
prevents a disconnected initiator from blocking play.

## Interaction and accessibility

- Standard transitions last 150–250 ms using ease-out curves.
- Loading uses skeletons; empty states explain the next useful action.
- Segmented choices use radios or tabs with selected state semantics.
- Switches expose `aria-checked`; ranges have programmatic labels and visible values.
- Focus never relies on the browser default being visible against the theme.
- The board keeps roving tabindex, arrow navigation, Enter/Space activation and a live region.
- `document.lang`, `theme-color` and translated labels update with settings.

## Responsive contract

The shell uses CSS Grid for content rows and a measured board stage. Board size is
the minimum of available width, actual remaining height and 720 px. No fixed-height
budget may depend on copy staying on one line.

Required visual baselines: 320×568, 390×844, 768×1024, 1280×720 and 1440×900,
for classic/quantum and dark/light where relevant.
