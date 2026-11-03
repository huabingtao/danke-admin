# Admin ESLint Cleanup Implementation Plan

> **For agentic workers:** Execute inline; retain all existing user changes and avoid broad component rewrites.

**Goal:** Remove the verified React Hooks ESLint errors in the item, reminder, and yield pages without disabling rules or changing their workflows.

**Architecture:** Keep API loaders and page state unchanged. Schedule initial loading from effects as an asynchronous task with cleanup, and declare the reminder resize callbacks before the handler that registers them.

**Tech Stack:** Next.js 16, React 19, TypeScript, ESLint 9, Vitest.

## Global Constraints

- Preserve all existing page behavior and visual design.
- Do not modify `lib/api.ts` or `package.json` user changes.
- Do not disable ESLint rules or rewrite unrelated components.

---

### Task 1: Fix Hooks lint errors

**Files:**
- Modify: `app/items/page.tsx`
- Modify: `app/reminders/page.tsx`
- Modify: `app/yields/page.tsx`
- Test: existing Admin Vitest suite

- [x] Schedule initial fetches from effects with timer cleanup.
- [x] Declare resize callbacks before their first reference.
- [x] Run Admin tests, TypeScript, and ESLint on affected files.

**Acceptance:** Existing tests and TypeScript pass; affected files have no ESLint errors.

**Rollback:** Revert only the effect scheduling and callback order edits in the three page files.
