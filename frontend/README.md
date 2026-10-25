# JobTrail frontend

React + TypeScript single-page app for the JobTrail API, built with Vite.

## Commands

Run from `frontend/` with Node 22.13 or newer:

| Command                | What it does                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| `npm install`          | Install the exact versions from `package-lock.json`                                                |
| `npm run dev`          | Dev server on http://localhost:5173 (expects the API on http://localhost:8000)                     |
| `npm run lint`         | ESLint                                                                                             |
| `npm run typecheck`    | TypeScript type check                                                                              |
| `npm test`             | Vitest + Testing Library tests (the API is mocked)                                                 |
| `npm run format:check` | Prettier check (`npm run format` fixes the files)                                                  |
| `npm run build`        | Type check, then production build into `dist/`                                                     |
| `npm run gen:api`      | Regenerate `src/api/schema.ts` (types and enum value lists) from the running API's `/openapi.json` |

## Configuration

`VITE_API_URL` is the API base URL. Vite replaces it at build time: `.env.development` sets it for `npm run dev`, `.env.test` for the tests, and the Docker build gets it as a build argument (see the root README).

## Docker

`Dockerfile` builds the static files with Node, then serves them with `nginx-unprivileged` (non-root, port 8080) using `nginx.conf`: a fallback to `index.html` for client-side routes, long caching for hashed assets and no caching for `index.html`. It is the `web` service in the root `docker-compose.yml`.

## Structure

- `src/api/`: generated types and enum value lists (`schema.ts`), readable names for them (`types.ts`), the fetch wrapper (`client.ts`), one function per endpoint (`endpoints.ts`), the query keys and hooks (`queries.ts`) and the TanStack Query defaults (`queryClient.ts`).
- `src/pages/`: one component per route (applications list, application detail, add application, import, companies, dashboard, not found).
- `src/components/`: shared UI (layout, dialog, form fields, badges, buttons, notices, loading/empty/error states) and one folder per area (`applications/`, `companies/`, `importing/`, `dashboard/`).
- `src/lib/`: plain functions without React (formatting, list filters, form ↔ API conversion, error messages, reading import files), most with unit tests.
- `src/test/`: test setup, a render helper with the app's providers, fixtures and an API mock helper.
