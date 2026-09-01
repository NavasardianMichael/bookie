# Design system — prototype alignment

Restyle against `design/initial prototype`. The visual language is Manrope on a
warm-gray canvas (`#f6f7f8`), charcoal copy (`#121417`), navy brand (`#18294e`),
and white `Surface` panels. Dark-mode tokens in those HTML files were not
adopted — the app stays light-only.

What landed:

- Tokens, theme and `globals.css` type scale rewritten to the prototype palette.
- Font switched from Open Sans to Manrope.
- Sticky 64px header with BrandLockup, Sign In + Get Started, underline active nav.
- Site footer with real routes only (no Pricing / Blog stubs).
- Landing page: hero, category rail, feature bento, provider grid, navy CTA band.
- Explore (`/providers`): centred lead, chip rail, View-profile cards.
- Public provider profile: 2-column bento (sidebar + calendar) stacking below `lg`.
- Auth funnel sits in a `Surface` card.

Prototype chrome that pointed at product we do not have (search that does
nothing, ratings, payments, a provider-portal sidebar) was not copied.
