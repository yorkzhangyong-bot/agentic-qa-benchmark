# Tasks: Comment Character Counter

**Input**: Design documents from `/specs/002-comment-character-counter/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/comment-form.md, quickstart.md

**Tests**: None requested in the spec. The web workspace has no unit-test runner and none is added. Browser tests are not part of this list; they are produced separately from spec.md. Each story ends with a manual check from quickstart.md instead.

**Organization**: Tasks are grouped by user story so that each story can be implemented and checked on its own. The whole change touches four files; see plan.md for the design and research.md for the decisions behind it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Web app (Angular) in `web/`; the feature lives in `web/src/app/features/article/pages/article/article.component.ts` and `article.component.html`
- Global stylesheet: `web/src/theme/conduit/styles.css` (the only global stylesheet the app loads)
- Third-party notices and the list of changes to the vendored apps: `NOTICE` at the repository root
- `api/` is untouched by this feature

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A working checkout with the seed data the checks rely on. No new dependencies or configuration.

- [ ] T001 Verify the environment from the repository root: `node --version` is 22.12 or newer; run `npm run setup` if `node_modules/` or `api/dev.db` is missing; with the API stopped, run `npm run db:reset` if the seed data was changed earlier, so that `alice@example.com` (password `Password123!`) exists and "Markdown cheat sheet for Conduit authors" (`/article/Markdown-cheat-sheet-for-Conduit-authors-dfc9b07f`) has no comments

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

No foundational tasks: the article page component, its reactive `commentControl`, the `*ifAuthenticated` directive and the comment-form styles already exist. User story work can begin right after Phase 1.

**Checkpoint**: Phase 1 done; user story implementation can begin.

---

## Phase 3: User Story 1 - See how long my comment is (Priority: P1) 🎯 MVP

**Goal**: Signed-in users see "N/500" directly under the comment box, following every change to the box; signed-out visitors see no counter (spec FR-001 to FR-005, FR-013).

**Independent Test**: Sign in as alice, open "Markdown cheat sheet for Conduit authors", see "0/500" under the empty comment box, type "Hello world!" and see "12/500", delete the text and see "0/500" again; signed out, the article shows "Sign in or sign up to add comments on this article." and no counter (quickstart.md checks 1 to 5, 13, 15 and 20).

### Implementation for User Story 1

- [ ] T002 [US1] Add the derived count to `web/src/app/features/article/pages/article/article.component.ts`: import `toSignal` from `@angular/core/rxjs-interop` and `map` from `rxjs/operators`, and add `commentLength = toSignal(this.commentControl.valueChanges.pipe(map(value => value.length)), { initialValue: 0 });` directly after `commentControl`. Per data-model.md it "equals `commentControl.value.length` at all times, starting at 0" and counts UTF-16 code units ("spaces, punctuation and line breaks count 1 each; an emoji such as 😀 counts 2"). Change nothing else in the class.
- [ ] T003 [US1] Render the counter in `web/src/app/features/article/pages/article/article.component.html`: directly after the comment textarea, still inside `<div class="card-block">`, add `<small class="comment-counter">{{ commentLength() }}/500</small>`. Per contracts/comment-form.md the text is "Exactly `<N>/500` ... no other text in the element", and the element sits "inside `.comment-form .card-block`, immediately after the textarea". The form is already wrapped in `*ifAuthenticated="true"`, so signed-out visitors never see it. Depends on T002.
- [ ] T004 [P] [US1] Style the counter in `web/src/theme/conduit/styles.css`: next to the existing `.article-page .comment-form .card-block textarea` rule, add `.article-page .comment-form .comment-counter { display: block; padding: 0 1.25rem 0.5rem; font-size: 0.8rem; text-align: right; color: var(--text-muted); }`, and add `comment-counter` to the "Comments:" line of the header comment at the top of the file (the list of classes in use). No other colour, font or layout changes.
- [ ] T005 [US1] Manual check of User Story 1 with `npm run dev` per `specs/002-comment-character-counter/quickstart.md`: checks 1 to 5 (`0/500`, `12/500`, `6/500`, line break counts one, emoji counts two), check 13 (signed out: sign-in prompt, no counter), check 15 (`1/500` after typing `a`, `120/500` after pasting "a" x120) and check 20 (undo: paste `Hello world!`, Ctrl+Z, empty box and `0/500`). Fix and re-check until all pass.

**Checkpoint**: The counter is visible, correct and live for signed-in users, absent for visitors. The box still accepts more than 500 characters until User Story 2 is done.

---

## Phase 4: User Story 2 - Stay within the 500-character limit (Priority: P1)

**Goal**: The comment box accepts at most 500 characters; typing or pasting past 500 is cut off, a character that only partly fits is not added, the counter never shows more than "500/500", and a comment of exactly 500 characters posts normally and is listed with the same text (spec FR-006 to FR-008).

**Independent Test**: Signed in as alice on her article, paste "a" x500 followed by "b" x100 (600 characters) into the empty box: the box keeps exactly the 500 a and no b, the counter reads "500/500", typing "b" adds nothing, and "Post Comment" lists a comment whose text is exactly those 500 a, after which the box is empty and the counter reads "0/500" (quickstart.md checks 6 to 9, 12 and 16 to 18).

### Implementation for User Story 2

- [ ] T006 [US2] Add `maxlength="500"` to the comment textarea in `web/src/app/features/article/pages/article/article.component.html`, keeping `class="form-control"`, `placeholder="Write a comment..."`, `rows="3"` and `[formControl]="commentControl"` as they are. The browser then cuts typing and pasting off at 500 and does not insert a character that only partly fits (research.md decision 2), and the attribute also activates Angular's `MaxLengthValidator` on `commentControl` as a safety net. Per data-model.md, `0 <= commentLength() <= 500` must hold "for every value produced by user editing". No change to `addComment()` or to the API. Same file as T003, so do it after T003.
- [ ] T007 [US2] Manual check of User Story 2 with `npm run dev` per `specs/002-comment-character-counter/quickstart.md`: checks 6 to 9 (pasting "a" x500 followed by "b" x100 keeps exactly the 500 a and shows `500/500`; typing `b` into the full box adds nothing; selecting the last 10 characters and typing `b` gives `491/500`; "a" x500 posts, is listed with the same text, and the counter returns to `0/500`), check 12 (498 characters plus two line breaks, and 498 characters plus `😀`, both end at `500/500`: the box is full exactly when the counter reaches 500) and checks 16 to 18 ("a" x499 then `b` gives `500/500`; "a" x499 then pasting `😀` stays at `499/500` with the box unchanged; "a" x490 then pasting `abcdefghijklmnopqrst` adds only `abcdefghij`). Fix and re-check until all pass.

**Checkpoint**: User Stories 1 and 2 together deliver the requested feature: a live counter with a hard maximum of 500.

---

## Phase 5: User Story 3 - The counter stays right after posting, errors and reloads (Priority: P2)

**Goal**: Whatever empties or changes the box, the counter matches it: "0/500" after a successful post and after a reload, unchanged after a failed post, correct after cutting text, and everything else about comments unchanged (spec FR-009 to FR-012).

**Independent Test**: Signed in as alice on her article, type "Nice summary." ("13/500") and post it: the comment "Nice summary." is listed and the counter reads "0/500"; type three spaces ("3/500") and click "Post Comment": "body can't be blank" and still "3/500"; reload: empty box and "0/500" (quickstart.md checks 10, 11, 14, 19, 21 and 22).

### Implementation for User Story 3

- [ ] T008 [US3] Confirm in `web/src/app/features/article/pages/article/article.component.ts` that `addComment()` still calls `this.commentControl.reset('')` only in the success branch and leaves the control untouched in the error branch, so the `valueChanges`-driven `commentLength` returns to 0 after a post (FR-009) and keeps its value after a failed post (FR-010). No code change is expected from T002; if the reset were missing or moved, restore it. Depends on T002.
- [ ] T009 [US3] Manual check of User Story 3 with `npm run dev` per `specs/002-comment-character-counter/quickstart.md`: check 10 (three spaces, "Post Comment": `body can't be blank`, no comment added, spaces still in the box, `3/500`), check 11 (type `Hello world!`, reload: empty box, `0/500`), check 14 (delete the test comment with its trash icon: gone at once, still gone after a reload), check 19 (type `Hello world!`, select all and cut with Ctrl+X: empty box, `0/500`), check 21 (while `Nice summary.` is being posted the form is disabled and the counter keeps `13/500`; afterwards the comment is listed under alice, the box is empty and the counter reads `0/500`; the comment survives a reload and its trash icon deletes it) and check 22 (the seeded article with 5 comments still lists all 5, none with a trash icon). Fix and re-check until all pass.

**Checkpoint**: All three user stories pass their quickstart checks.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Record the change, keep formatting consistent, and prove the production build.

- [ ] T010 [P] Add one line to the `web/` list under "Changes made in this repository" in `NOTICE`: "Added a character counter and a 500-character limit to the comment box on the article page." Keep the rest of the file unchanged.
- [ ] T011 Formatting check from `web/`: `npx prettier --check --end-of-line auto src/app/features/article/pages/article/article.component.ts src/app/features/article/pages/article/article.component.html src/theme/conduit/styles.css`. The `--end-of-line auto` flag is needed because the checkout has CRLF line endings under `core.autocrlf=true`; without it the check fails on line endings alone, before any change. If the check fails, run the same command with `--write` instead of `--check` and review the diff. Depends on T002, T003, T004 and T006.
- [ ] T012 Build check from the repository root: `npm run build` (Prisma client generation, `api/` and `web/` production builds, as CI runs them) must finish without errors or new warnings. Depends on all code tasks (T002, T003, T004, T006).
- [ ] T013 Final pass: with all changes in place, run `specs/002-comment-character-counter/quickstart.md` checks 1 to 22 in one session, and confirm with `git status` that, outside `specs/002-comment-character-counter/`, only the four intended files changed: `web/src/app/features/article/pages/article/article.component.ts`, `web/src/app/features/article/pages/article/article.component.html`, `web/src/theme/conduit/styles.css` and `NOTICE`. Depends on T010 to T012.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; start immediately.
- **Foundational (Phase 2)**: Nothing to do; does not block anything.
- **User Stories (Phases 3 to 5)**: Depend on Phase 1. Stories are done in priority order (US1, then US2, then US3); US2 and US3 edit or read files that US1 changes, so they follow US1 rather than run alongside it.
- **Polish (Phase 6)**: Depends on all code tasks of the user stories.

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Phase 1. No dependency on other stories. Delivers the MVP.
- **User Story 2 (P1)**: T006 edits the same template as T003, so it follows US1. Independently checkable once done (quickstart checks 6 to 9, 12 and 16 to 18).
- **User Story 3 (P2)**: T008 reads the class changed in T002; no code change expected. Independently checkable (quickstart checks 10, 11, 14, 19, 21 and 22).

### Within Each User Story

- T002 before T003 (the template reads the signal; the other order breaks the build).
- T004 is independent of T002 and T003 (different file).
- Each story's manual check comes last in its phase.

### Parallel Opportunities

- T004 (stylesheet) can run alongside T002 and T003 (component).
- T010 (NOTICE) can run at any time, alongside any other task.
- T011 (formatting check) is not parallel: it waits for T002, T003, T004 and T006, and T012 and T013 follow it in order.
- Everything else is sequential: a single component template and class are edited in order.

---

## Parallel Example: User Story 1

```bash
# One person or agent edits the component, in order:
Task: "T002 Add the derived count in web/src/app/features/article/pages/article/article.component.ts"
Task: "T003 Render the counter in web/src/app/features/article/pages/article/article.component.html"

# At the same time, another edits the stylesheet:
Task: "T004 Style the counter in web/src/theme/conduit/styles.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Phase 2 has nothing to do.
3. Complete Phase 3: User Story 1 (T002 to T005).
4. **STOP and VALIDATE**: quickstart checks 1 to 5, 13, 15 and 20.
5. The live counter is demonstrable; the limit is not yet enforced.

### Incremental Delivery

1. User Story 1: counter visible and live (MVP).
2. User Story 2: the 500-character limit; together with US1 this is the complete request.
3. User Story 3: confirm the counter after posting, errors and reloads (no code expected).
4. Phase 6: NOTICE line, formatting check, `npm run build`, final pass.

### Parallel Team Strategy

The change is small enough for one person. If two work on it: one takes the component (T002, T003, T006, T008), the other the stylesheet and NOTICE (T004, T010). Once both are done, T011, T012 and T013 run in that order; the formatting check waits for all code tasks, so it is not a parallel task.

---

## Notes

- [P] tasks = different files, no dependencies.
- [Story] label maps a task to its user story for traceability.
- No API, dependency or configuration changes anywhere in this list (plan.md, Constraints).
- Commit after each task or logical group; stop at any checkpoint to validate the story.
- Avoid: enforcing the limit in `api/` (out of scope, spec Assumptions decision 5: the server does not enforce the limit, no API change), truncating text in an `(input)` handler (rejected in research.md decision 2), `aria-live` on the counter (rejected in research.md decision 3).
