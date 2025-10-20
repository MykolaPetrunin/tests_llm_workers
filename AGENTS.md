# Repository Guidelines

## Project Structure & Module Organization
This Fastify worker runs on TypeScript. `src/index.ts` bootstraps the server, registers routes, and wires worker status. HTTP handlers live in `src/routes/topics.ts`; background orchestration stays under `src/workers/` with shared logic in `src/workers/utils/`. Common utilities, Prisma access, and AI prompts are in `src/lib/`, while compiled output goes to `dist/`. Copy `env.example` to `.env` for configuration; infrastructure files such as `Dockerfile` and `fly.toml` stay at the repo root.

## Build, Test, and Development Commands
Install dependencies with `npm install` (Node 20+). `npm run dev` starts a watch server via tsx, and `npm run build` compiles TypeScript plus rewrites alias paths through `tsc-alias`. Use `npm start` to serve the compiled bundle, `npm run type-check` for a quick `tsc --noEmit`, and `npm run clean` to drop old builds. API smoke tests are exposed as curl scripts: `npm run test:health` pings `/health`, `npm run test:worker` submits a sample job, and `npm run test:worker:real` should only run with production data.

## Coding Style & Naming Conventions
Follow the existing two-space indentation and keep blocks compact. Export ES2022 modules, use camelCase for functions and variables, PascalCase for types, and descriptive filenames (`fillBookWorker.ts`). Prefer the `@/` alias instead of deep relative paths, and validate new environment variables through the Zod schemas alongside the existing helpers.

## Testing Guidelines
There is no dedicated Jest/Vitest suite yet, so pair type checking with the curl scripts before every push. Extend `package.json` with new scripts whenever you add routes or workers so they can be exercised consistently. Keep external calls mockable by routing integrations through the helpers in `src/lib/` to make future tests easier.

## Commit & Pull Request Guidelines
Current history uses sentence-style summaries that explain both change and intent (e.g., `Update package dependencies and build script.`). Keep commit messages concise, in the imperative where natural, and add follow-up lines when extra context matters. Pull requests should link issues, call out environment or schema updates, list the commands you ran (`npm run build`, smoke curls), and include screenshots or logs for error scenarios.

## Security & Configuration Tips
Never commit `.env` or secrets. Ensure `DATABASE_URL` and `OPENAI_API_KEY` exist before calling `/api/start-filling-topics-with-data`. Prisma Client is generated in the parent application; verify `node_modules/@prisma/client` is present after installs and coordinate schema changes with that repo. Use `fly secrets` or local env vars for sensitive values instead of hard-coding defaults.
