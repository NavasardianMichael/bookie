# Project Development Rules for AI Agents

## Stack

- Next.js (App Router) + TypeScript
- Ant Design UI
- Zustand (with immer)
- pnpm
- CSS + Tailwind utilities

## Project Structure

src/

- api/ Domain API modules
- app/ App Router pages/layouts
- components/ Reusable UI components
- constants/ Application constants
- helpers/ Shared utilities
- hooks/ Custom React hooks
- interfaces/ Shared TypeScript interfaces
- store/ Zustand stores/selectors
- styles/ Global/override styles
- types/ Domain-specific types

## Core Rules

- Before creating or modifying code, always inspect existing files in the same domain/folder and follow the established structure, naming, and patterns exactly. Do not invent new patterns.
- Add comments only when the code's purpose is not immediately clear from its context or naming, or for readability.

## Secrets & Env Files

- Never read, open, search, or print any file starting with `.env` (`.env`, `.env.local`, `.env.development`, `.env.production`, `.env.*.local`, `server/.env`, etc.), at any depth and by any means — including shell commands.
- Only `*.env.example` files (`.env.example`, `server/.env.example`) may be read. Use them to see which keys exist and to document them.
- If a real env file is missing, copy the matching `.env.example` and leave placeholders. Never inspect a secret env file to discover a value, and never echo secret values into code, comments, or commits.

## Canonical References

- API pattern: src/api/auth/, src/api/providers/
- Store pattern: src/store/auth/, src/store/providers/
- Components: src/components/shared/
- Error handling: src/helpers/error.ts
- Types: src/interfaces/, domain types.ts

## Next.js Rules

- Server Components by default.
- Add `"use client"` only when using hooks, store access, browser APIs, or interactivity.
- Do not access browser APIs in Server Components.
- Use the existing API layer for all data access.

## State Management Rules

- Store logic only inside src/store/.
- Async logic must follow the existing Zustand action pattern (`create` + `devtools` + `immer`, async actions on the store).
- Use the generated `use.*` selectors from `appendSelectors`; do not access state shape directly.
- Do not couple API layer with store logic.

## Code Style

- No `any` without explicit justification.
- Explicit types for params and return values.
- Named exports preferred unless existing code uses default.
- Import order: follow simple-import-sort/imports ESLint rule.
- Prefer absolute imports from src/.
- Keep files small and focused; split when needed.

## Components

- Strongly typed Props type required.
- Reuse existing components before creating new ones.
- Prefer Ant Design components over custom UI. Only keep using semantically rich custom components (e.g., AppTitle) in route main file (page.tsx) to keep it rendered on the server.
- Style with Tailwind utilities; minimal CSS.
- Avoid unnecessary re-renders and inline heavy logic.
- useMemo and useCallback for expensive calculations and functions passed as props, other optimizations as needed (e.g. useTransition).

## API Rules

- Endpoints defined only in endpoints.ts.
- No hardcoded URLs outside API layer.
- Keep API logic isolated from UI and store.

## Error Handling

- All async operations must handle errors.
- Reuse helpers from src/helpers/error.ts.
- Do not swallow errors silently.

## Git

- Clear, descriptive commits.
- Use Conventional Commits when applicable.

## Forbidden

- Skipping types
- Hardcoding endpoints
- Mixing UI, API, and store concerns
- Introducing new patterns without precedent
- Duplicating existing functionality
- Reading or printing `.env*` files (except `*.env.example`)
