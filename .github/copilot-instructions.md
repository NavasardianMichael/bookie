# Project Development Rules for AI Agents

## Stack

- Next.js (App Router) + TypeScript
- Ant Design UI
- Redux Toolkit
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
- store/ Redux slices/selectors
- styles/ Global/override styles
- types/ Domain-specific types

## Core Rules

- Before creating or modifying code, always inspect existing files in the same domain/folder and follow the established structure, naming, and patterns exactly. Do not invent new patterns.
- Add comments only when the code's purpose is not immediately clear from its context or naming, or for readability.

## Canonical References

- API pattern: src/api/auth/, src/api/providers/
- Store pattern: src/store/auth/, src/store/providers/
- Components: src/components/shared/
- Error handling: src/helpers/error.ts
- Types: src/interfaces/, domain types.ts

## Next.js Rules

- Server Components by default.
- Add `"use client"` only when using hooks, Redux, browser APIs, or interactivity.
- Do not access browser APIs in Server Components.
- Use the existing API layer for all data access.

## State Management Rules

- Redux logic only inside src/store/.
- Async logic must follow existing thunk pattern.
- Use selectors; do not access state shape directly.
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
