# JobTrail frontend

React + TypeScript single-page app for the JobTrail API, built with Vite.

## Commands

Run from `frontend/` with Node 22.13 or newer:

| Command                | What it does                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `npm install`          | Install the exact versions from `package-lock.json`                                      |
| `npm run dev`          | Dev server on http://localhost:5173 (expects the API on http://localhost:8000)           |
| `npm run lint`         | ESLint                                                                                   |
| `npm run typecheck`    | TypeScript type check                                                                    |
| `npm test`             | Vitest + Testing Library tests (the API is mocked)                                       |
| `npm run format:check` | Prettier check (`npm run format` fixes the files)                                        |
| `npm run build`        | Type check, then production build into `dist/`                                           |
| `npm run gen:api`      | Regenerate `src/api/schema.d.ts` from the running API's OpenAPI schema (`/openapi.json`) |

## Configuration

`VITE_API_URL` is the API base URL. Vite replaces it at build time: `.env.development` sets it for `npm run dev`, and `.env.test` for the tests.

## Structure

- `src/api/`: generated types (`schema.d.ts`), readable names for them (`types.ts`), the fetch wrapper (`client.ts`), one function per endpoint (`endpoints.ts`) and the TanStack Query defaults (`queryClient.ts`).
- `src/components/`: the layout with navigation, the page header and the API status indicator.
- `src/pages/`: one component per route.
- `src/test/`: test setup and a render helper with the app's providers.
