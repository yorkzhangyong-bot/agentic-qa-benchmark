# Implementation Plan: Comment Character Counter

**Branch**: `feature/comment-character-counter` | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-comment-character-counter/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Signed-in users get a live "N/500" character counter directly under the comment box on the article page, and the box stops accepting input at 500 characters (spec FR-001 to FR-013). Technically this is a change to one Angular component: the textarea gets `maxlength="500"`, a derived signal exposes the current length of the existing `commentControl`, the template prints it under the textarea, and one rule in the Conduit theme stylesheet styles it as muted helper text. No API, data, dependency or configuration changes.

## Technical Context

**Language/Version**: TypeScript ~5.9.3 and Angular 21.2.12 (standalone components, signals, OnPush, zoneless change detection, reactive forms); Node.js 22.12 or newer with npm, no Bun.

**Primary Dependencies**: `@angular/core` (`signal`), `@angular/core/rxjs-interop` (`toSignal`; the package is already used across the app for `takeUntilDestroyed`), `@angular/forms` (`FormControl`, `ReactiveFormsModule`, and the `MaxLengthValidator` directive that the `maxlength` attribute activates), RxJS 7 (`map`). No new packages.

**Storage**: N/A. The SQLite database and the Prisma models in `api/` are untouched; the comment body keeps its current validation (trimmed, non-empty, no maximum).

**Testing**: `npm run build` from the repository root (production build of `api/` and `web/`, the same command CI runs) plus the manual checks in [quickstart.md](quickstart.md). The web workspace has no unit-test runner (the upstream tests and their tooling were removed, see `NOTICE`), and none is added. Browser end-to-end tests are outside this plan; they are produced separately from `spec.md`.

**Target Platform**: Current desktop browsers running the single-page app at `http://localhost:4200` against the API at `http://localhost:3000`; developed on Windows and Linux.

**Project Type**: Web application in an npm workspace: Angular front end in `web/`, Nitro + Prisma API in `api/`. Only `web/` changes.

**Performance Goals**: The counter updates in the same frame as the keystroke or paste, with no perceptible lag (one signal update per input event).

**Constraints**: No API changes, no new dependencies, no new configuration, no visual redesign (spec FR-013). The counting unit is UTF-16 code units for both the counter and the limit (spec FR-004). The app is zoneless and the component is OnPush, so the template must read a signal.

**Scale/Scope**: One component (template and class), one stylesheet rule, one `NOTICE` line: about 20 changed lines.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the unfilled Spec Kit template: every principle, section and governance rule is still a placeholder, so it defines no gates and there is nothing to evaluate. In its place this plan sets its own constraints: no API changes, no new libraries or configuration, no test hooks in the app, and the smallest change that meets the spec. `README.md` states none of these as rules; it only keeps the vendored apps as they are and asks that every change to them is listed in `NOTICE`, which the constraints respect.

- Before Phase 0: PASS (no gates defined; the constraints above are met by design).
- After Phase 1 design: PASS. The design adds no project, service, abstraction or dependency.

## Project Structure

### Documentation (this feature)

```text
specs/002-comment-character-counter/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── comment-form.md  # Phase 1 output: UI contract of the comment form (no API change)
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify command output)
├── run-status.md        # The coordinator's run log, not a Spec Kit artefact
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
web/src/app/features/article/pages/article/
├── article.component.html   # comment form: maxlength="500" on the textarea, counter line directly under it
└── article.component.ts     # new commentLength signal derived from commentControl.valueChanges

web/src/theme/conduit/styles.css   # one rule for .article-page .comment-form .comment-counter; class added to the header list

NOTICE                             # one line under "Changes made in this repository" > web/

api/                               # untouched
```

**Structure Decision**: The repository is an npm workspace with the Angular app in `web/` and the API in `api/`. The feature lives entirely in the existing article page component (`web/src/app/features/article/pages/article/`) and is styled in the existing global Conduit stylesheet, the only global stylesheet the app loads. No new source files or folders.

## Implementation Outline

Decisions and rejected alternatives are in [research.md](research.md), the component state and its transitions in [data-model.md](data-model.md), and the rendered result in [contracts/comment-form.md](contracts/comment-form.md).

1. `web/src/app/features/article/pages/article/article.component.ts`: import `toSignal` from `@angular/core/rxjs-interop` and `map` from `rxjs/operators`, and add next to `commentControl`:
   `commentLength = toSignal(this.commentControl.valueChanges.pipe(map(value => value.length)), { initialValue: 0 });`
   Nothing else in the class changes. `addComment()` already calls `this.commentControl.reset('')` on success, which emits `''` and brings the counter back to 0 (FR-009); on failure the control is left alone (FR-010).
2. `web/src/app/features/article/pages/article/article.component.html`: add `maxlength="500"` to the comment textarea (FR-006 to FR-008) and, directly after it inside `.card-block`, `<small class="comment-counter">{{ commentLength() }}/500</small>` (FR-001, FR-003). The form is already inside `*ifAuthenticated="true"`, so signed-out visitors never see the counter (FR-002).
3. `web/src/theme/conduit/styles.css`: next to the other `.article-page .comment-form` rules, add `.article-page .comment-form .comment-counter { display: block; padding: 0 1.25rem 0.5rem; font-size: 0.8rem; text-align: right; color: var(--text-muted); }` (FR-013), and add `comment-counter` to the "Comments:" line of the header comment that lists the classes in use.
4. `NOTICE`: one line under `web/` in "Changes made in this repository", for example "Added a character counter and a 500-character limit to the comment box on the article page."
5. Verify with [quickstart.md](quickstart.md), including `npm run build` and the formatting check of the three changed files under `web/` (prettier with `--end-of-line auto`, because the checkout has CRLF line endings under `core.autocrlf=true`).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations; nothing to justify.
