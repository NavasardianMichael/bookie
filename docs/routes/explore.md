# Explore — `/providers`

Design record for the Explore page. The rules that apply to every route are in
`src/app/CLAUDE.md`; this file is what to read before changing Explore itself.

## The state is the query string

`/providers` keeps search, category, filters, sort and page in the URL, and
`providers/exploreParams.ts` is the only module that knows their names. The page parses;
the two client islands patch. Nothing about this list lives in a store.

```
/providers?q=hair&category=<id>&available=true&openToday=true&sort=nameAsc&page=3
```

Why the URL and not `useProvidersListStore`: the grid is a Server Component, so the
query has to survive a round-trip regardless. Keeping it in the address bar gives one
source of truth instead of two, a shareable and back-buttonable result set, and no
provider rows duplicated into client state. **Do not hydrate the list store here.**

## Six decisions worth not undoing

1. **A category chip filters in place; it does not navigate.** The chip patches
   `?category=`, so the visitor's search and sort survive the click, and re-clicking the
   active chip clears it. `/categories/[categoryId]` still exists and is still where
   *View all* leads — those are single-category landing pages, not this rail's target.
2. **Only the search box and the sort/filter pair are client islands.** The chips and the
   pager are plain anchors: they work before hydration, they prefetch, and a crawler can
   follow them. `ui/layout/Pagination` is antd-free for exactly that reason.
3. **The search field is locally controlled and the URL is its output.** `params.q`
   seeds the first render and is written back only when the URL changes from outside
   the field (Clear all filters, Back); `committedRef` is how the field tells that apart
   from its own submit landing. It `replace`s rather than `push`es, like sort and filter,
   with `scroll: false`.
4. **Typing suggests; only a submit searches.** Typing fills an antd `AutoComplete`
   dropdown with the first `PROVIDER_SUGGESTIONS_LIMIT` (5) matches, fetched on the
   client by `useProviderSuggestions` through the ordinary `GET /providers` with a small
   `perPage` — no endpoint of its own. The debounce and stale-answer guard are
   `@hooks/useDebouncedLookup`, shared with the registration Organization field. A search
   that finds nothing is retried by the API with typo- and accent-tolerant spellings, so
   "masage" still suggests the massage therapist. The query comes from
   `toProviderSuggestionsQuery`, which keeps the current category, filters and sort, so the
   dropdown previews the grid Enter would produce. Picking a row opens that provider's
   page. The grid moves only on **Enter** or the **Search** button, which close the
   dropdown and write `?q=`; the clear button submits `''`, but emptying the box by hand is
   still just typing. Same staging as the filter sheet — *Show results* is its only
   navigation.

   Enter is handled in the `AutoComplete`'s `onKeyDown`, not the form's `onSubmit`:
   rc-select handles the key first and `preventDefault`s an Enter that picked a
   highlighted row, which is how a pick and a submit are told apart. An Enter on a closed
   list also makes rc-select reopen it, and closing it from the same handler lands both
   updates in one batch, so the dropdown does not flash. The `<form role='search'>` is
   there for the button and the landmark.
5. **Only the results subtree suspends.** `<Suspense>` wraps `ProvidersResults` alone:
   the heading, search box, rail and toolbar are already correct for the new query. The
   boundary has **no** `key` — a key remounts it and throws the current grid away for a
   skeleton on every query. Search and sort/filter wrap URL updates in a shared
   `useTransition`, so the current cards stay under a translucent overlay
   (`ExplorePending`) while the next set streams in. The skeleton remains the cold-load
   fallback (`loading.tsx` and the boundary's first paint).
6. **A card names the one service a search matched, and only when a service matched.**
   `GET /providers` adds `matchedService` and `moreMatchingServices` to a row whose match
   was a service (`docs/DATABASE_STRUCTURE.md`, *the Explore query*); `ProviderCard` renders
   them through `MatchedServiceLink` in the card's `footer`. A provider found by name, and
   any card on favourites, categories or the home page, stays plain. One service keeps the
   grid's cards one height; the rest are "+N more", which opens the profile's service list.
   The service links to `?service=<id>#booking-services`
   (`[providerId]/components/serviceParams.ts`), read by the page's Server Component and
   checked against the provider's own catalogue before `ProviderDetails` starts with it
   selected. The suggestions dropdown shows the same service as its row's subtitle.

## Where Explore deviates from `design/initial prototype/explore_service_providers`

| Prototype | Built as | Why |
|---|---|---|
| Search + **Location** field + Search button | Search field with a suggestions dropdown + Search button; no Location | `Provider.address` is free text with no geocoding, so a Location box would match strings rather than places. The button is icon-only below `sm`. |
| "Sort by: Recommended" as inline text | Icon `Button` + `Dropdown`, beside *Service providers* | Paired with the filter control; the label still shows from `sm` up. |
| Rating badge and star on every card | Rating in the card body, availability as a pill on the image, top-start | Three statuses from `available` + `openToday`, not remaining slots: Available (green), Closed (orange, no hours today), Fully blocked (red, bookings paused). |
| "Next: Today, 2 PM" on every card | Omitted | One availability computation per card, per page render. |
| `1 2 3 … 12` pager | Same, as links, elided at ±2 around the current page | Survives 200 pages as well as 12. |
