# Provider-only categories — 2026-10-13

## Before

`Category` was attached three ways, and only one of them had a working editor:

- **Service** — `Service.categoryId`, one optional category per service, set in the service
  form, where typing a name created a `Category` row.
- **Provider** — `ProviderCategory`, written only by the onboarding page
  `/providers/profile-creation`, which nothing linked to any more. Email-registered providers
  never had a way to set one.
- **Organization** — `OrganizationCategory`, written only by the seed.

Explore's category chips and `/categories/[id]` read the provider and organization links, so
a provider registered through the app never appeared in a category view; text search reached
them only through their services' categories.

## After

- **Providers only.** `ProviderCategory`, 0–3 per provider. `OrganizationCategory` and
  `Service.categoryId` are dropped (`20261013140000_provider_only_categories`). An
  organization's categories are its listed providers', derived on read
  (`organizationInclude`); a result card names a matched service by name only.
- **Predefined and added.** The six seeded categories stay translated in every locale and are
  never deleted. Providers may add their own; a name that is already a category — in any
  spelling, or as any translated label — links that one instead of creating a copy.
- **One field everywhere** — `CategoriesSection` / `CategoriesField` in
  `src/app/[lang]/auth/components/`, on provider registration (email and Google), becoming a
  provider and the settings Profile tab. It works like the Organization field, made multiple:
  search with suggestions, "add as new", removable chips, and a "this may already exist"
  question on submit (`useSimilarCategoryCheck`).
- **Unused categories are removed.** An added category no provider uses any more is deleted
  when the last link goes — on an edit, on deleting the provider page, on deleting the account.

Pre-release, so no data was carried over: the old service and organization links were
dropped, and added categories left with no provider were deleted by the migration.

Where it lives now: `server/src/services/categories.ts` (pure: parsing, ranking, duplicate
detection), `server/src/services/providerCategories.ts` (resolve, set, prune),
`server/src/routes/categories.ts`, and *Categories* in `docs/DATABASE_STRUCTURE.md`.
