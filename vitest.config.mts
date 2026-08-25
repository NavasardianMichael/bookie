import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Resolves `@helpers/*`, `@store/*`, `@test/*` … from tsconfig.json `paths`. Native
  // since Vite 8 — the `vite-tsconfig-paths` plugin is no longer needed.
  resolve: { tsconfigPaths: true },
  test: {
    // Node, not jsdom: nothing under tests/{unit,integration} touches the DOM. Add
    // jsdom + @testing-library/react when component tests arrive, and scope it with
    // a per-file `// @vitest-environment jsdom` rather than globally.
    environment: 'node',
    include: ['tests/{unit,integration}/**/*.spec.ts'],
    setupFiles: ['tests/setup/vitest.setup.ts'],
    // Booking slots are anchored in LOCAL time (`dayjs(date).startOf('day')`), so an
    // unpinned zone makes half these tests machine-dependent. vitest.setup.ts asserts
    // this actually took effect.
    env: { TZ: 'UTC' },
  },
})
