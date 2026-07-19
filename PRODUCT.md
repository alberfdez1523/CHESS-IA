# Gambito de Dama Cuántico

## Product

Gambito de Dama Cuántico is a responsive web chess game that pairs a complete
classic mode with an original quantum ruleset based on superposition, merging,
tunnelling, entanglement and probabilistic measurement.

The product should feel like an editorial chess club crossed with a precise
scientific instrument: calm, trustworthy and legible during normal play, with
controlled spectacle reserved for genuinely quantum events.

## Audience

- New players who need to understand the quantum rules without reading a manual.
- Regular chess players who expect a fast, familiar board-first workflow.
- Friends playing locally or online who need clear turn, connection and result states.

The default experience serves a mixed audience. Guidance is progressive and can
be skipped; expert controls remain direct and compact.

## Platform

Web. The same React application must support desktop, tablet and mobile in dark
and light themes, in Spanish and English, with keyboard and screen-reader access.

## Core journeys

1. Start a quantum game against medium AI in no more than two decisions.
2. Configure a classic, local or online game without seeing irrelevant options.
3. Understand a selected quantum piece, its branches and the risk of a capture.
4. Complete a measurement without losing track of the board or whose turn follows.
5. Finish a game into a durable result state and choose rematch, review or menu.
6. Learn the rules through seven guided Academy missions and retain full reference access.

## Rules contract

- Classic mode follows chess.js.
- Quantum mode has no check or checkmate; capturing the opposing king wins.
- A side with no legal quantum action draws.
- Distinct allied pieces cannot occupy the same square.
- Every state transition is validated through a typed action boundary.
- Measurement randomness is injectable and reproducible from seed plus counter.
- Terminal results survive dismissing the presentation layer.
- Undo means one ply locally, a full human/AI turn against AI, and is unavailable online.

## Success criteria

- Body text contrast is at least 4.5:1 in both themes.
- Every selectable state is conveyed semantically and never by color alone.
- All primary targets are at least 44 by 44 CSS pixels.
- No board or game control clips from 320×568 through 1440×900 or at 200% zoom.
- A first-time player can identify a piece's quantum branches without opening the rules.
- A completed, resigned or timed-out game cannot resume accidentally.

## Deferred

Ranked play, spectators, daily puzzles, advanced statistics and a coherence-limited
competitive variant remain outside this release. Competitive online play requires
server-authoritative action validation first.

## Verification baseline

Before the redesign the repository passed 31 frontend unit tests, 9 backend tests,
8 browser journeys and the production build. The redesign extends that contract
with deterministic quantum action tests, autosave validation, synchronized online
metadata and responsive board checks at 320×568, 390×844, 768×1024, 1280×720 and
1440×900.

Current verified baseline: 53 frontend unit tests, 9 backend tests, 16 Chromium
end-to-end journeys and a successful Vite production build. The browser matrix also
includes 844×390 landscape, reduced motion, keyboard selection, timeouts, persistent
post-game actions, saved-game recovery and advanced quantum actions.
