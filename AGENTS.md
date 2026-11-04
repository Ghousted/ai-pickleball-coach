<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## AI Coach project notes

- Product docs: PRD, sitemap and user journey (kept outside the repo). Design: "AI Coach Prototype v2".
- Styles live in `src/app/globals.css` (tokens copied from the design). Keep new screens on those classes.
- All AI calls go through `src/lib/ai/provider.ts` (one provider setting). Agents are in `src/lib/ai/agents.ts`.
- Schema changes: edit `src/lib/db/schema.ts`, then `npm run db:generate`. Never edit generated SQL by hand.
- Check before you finish: `npm run typecheck && npm run lint && npm run build`.
