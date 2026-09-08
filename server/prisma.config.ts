// Replaces the `prisma` block in package.json, which Prisma 6.19 deprecates and Prisma 7
// removes. `migrations.seed` is what `prisma migrate dev` and `prisma migrate reset` run
// after applying migrations; `pnpm db:seed` calls the same script directly.
import { defineConfig } from 'prisma/config'

// A config file opts the CLI out of loading the env file implicitly ("Prisma config
// detected, skipping environment variable loading"), so — as in prisma/seed.ts — it has
// to be loaded here or DATABASE_URL is undefined. Import order is set by simple-import-sort;
// the side effect still runs before defineConfig is called, and the datasource URL is not
// read until the schema engine resolves it.
import 'dotenv/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})
