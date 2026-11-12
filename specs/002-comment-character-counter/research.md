# Research: Comment Character Counter

**Feature**: [spec.md](spec.md) | **Date**: 2026-11-12

Nothing in the Technical Context of [plan.md](plan.md) is left open: the stack is fixed by the repository and the behaviour is fixed by the spec. This file records the implementation decisions the spec leaves to the plan, each with the alternatives that were rejected.

## 1. Where the count comes from

**Decision**: Derive the count from the existing reactive control `commentControl` (a non-nullable `FormControl<string>`) as a signal, with `toSignal` from `@angular/core/rxjs-interop`: `commentLength = toSignal(this.commentControl.valueChanges.pipe(map(value => value.length)), { initialValue: 0 })`, read in the template as `{{ commentLength() }}/500`.

**Rationale**: `valueChanges` fires for every way the box can change: typing, deleting, cutting, pasting, undo and replacing a selection (all arrive through the forms value accessor), and the app's own `reset('')` after a successful post. One source therefore covers FR-005 and FR-009 to FR-011. The app runs zoneless (`provideZonelessChangeDetection()` in `web/src/app/app.config.ts`) and the component uses OnPush, so the template must read a signal for the view to refresh reliably. `toSignal` is cleaned up with the component and needs no subscription code, and the package it comes from is already imported throughout the app for `takeUntilDestroyed`.

**Alternatives considered**:

- An `(input)` event handler on the textarea that sets a signal: misses the programmatic `reset('')` after posting, so the counter would keep the old number (FR-009) unless a second code path reset it.
- Reading `commentControl.value.length` directly in the template: refreshes only when something else happens to schedule change detection; fragile under zoneless and OnPush.
- A manual `valueChanges.subscribe` with `takeUntilDestroyed` writing a `signal<number>`: equivalent but more code; acceptable if the implementer prefers the pattern already used in the component.
- Rewriting the form with `ngModel` or signal forms: an unnecessary rewrite of a working form.

## 2. How the 500-character limit is enforced

**Decision**: Put `maxlength="500"` on the comment textarea. The browser then refuses typing past 500, truncates a paste to what still fits, taking the first characters, and does not insert a character that only partly fits (with one code unit left, pasting 😀 adds nothing), which is exactly FR-006. Because the element carries `[formControl]`, Angular's `MaxLengthValidator` directive picks up the same attribute and would mark the control invalid if the value ever exceeded 500 by other means, a harmless safety net. Nothing else is needed for FR-006 to FR-008.

**Rationale**: Native `maxlength` is the one mechanism that cuts typing and pasting off without re-implementing editing behaviour (caret position, undo history, composition input for East Asian keyboards). The HTML standard applies `maxlength` to the textarea's API value, which has line breaks normalised to a single LF character, and measures it in UTF-16 code units, which is exactly what `value.length` returns. So the counter (decision 1) and the limit agree by construction: a line break counts one, an emoji such as 😀 counts two (FR-004). [quickstart.md](quickstart.md) checks both in the real browser. Posting is unchanged: the form still sends `commentControl.value`, and a 500-character value is valid for the browser, for the Angular validator and for the API (FR-008). The API trims leading and trailing whitespace from the body before saving it (`z.string().trim()` in `api/server/schemas/comment.schema.ts`; the POST handler saves the parsed value), as today, and the list shows the stored text. FR-008 records this: a posted comment is listed with the same text, and, as today, leading and trailing spaces and line breaks are not kept.

**Alternatives considered**:

- Truncating in an `(input)` handler (`value.slice(0, 500)` written back to the control): re-implements what the browser already does, moves the caret to the end after every truncated paste and has to special-case composition input; rejected.
- `Validators.maxLength(500)` alone: marks the control invalid but lets the user type past 500 and would need a new error message; the spec asks for a hard cut-off, not an error.
- Enforcing the limit in the API: explicitly out of scope (spec Assumptions, decision 5: the server does not enforce the limit, no API change). The API keeps `z.string().trim().min(1, "can't be blank")` as its only rule for the body.

## 3. Where the counter sits and how it looks

**Decision**: Render the counter as `<small class="comment-counter">` inside the comment form's `.card-block`, immediately after the textarea, so it sits directly under the box and above the `.card-footer` row with the avatar and "Post Comment" (FR-001). Style it with one rule in `web/src/theme/conduit/styles.css`, next to the existing `.article-page .comment-form` rules: displayed as a block, right-aligned, small font, the theme's muted text colour (`var(--text-muted)`), and the same horizontal padding as the textarea (`1.25rem`) plus a little bottom padding, so the number lines up with the text in the box. Add `comment-counter` to the "Comments:" line of the stylesheet's header comment, which lists the classes in use.

**Rationale**: FR-013 asks for plain text in a smaller font than the comment box text, with nothing else on the page added, removed or restyled; a `<small>` element styled by one new rule meets that, and the counter's own line is the only addition. The theme already defines `--text-muted` and uses it for the comment box placeholder, so no new colour appears. Every other rule for the comment form lives in that stylesheet, and the app has no other global stylesheet (`web/angular.json` lists only the theme, the icon font and the web fonts). The `.card-block` has `padding: 0` and the textarea has no border, which is why the counter needs its own padding.

**Accepted trade-off**: `--text-muted` is `#999`, and on the white card at `0.8rem` that gives a contrast ratio of about 2.85:1, below the WCAG AA minimum of 4.5:1 for text of that size; the comment box placeholder already uses `#999`; the page's dates use the lighter `#bbb`. The colour is kept knowingly, for consistency with the vendored theme, rather than introducing a darker grey such as `#767676` only for the counter.

**Alternatives considered**:

- Putting the counter in `.card-footer` next to the avatar: it would sit beside the button rather than directly under the box; the spec's placement (Assumptions, decision 1) keeps the footer unchanged.
- Component-scoped styles (`styles:` in the component decorator): only the article list and the home page carry component-scoped styles, and everything about the comment form is styled in the theme stylesheet, so the new rule belongs there too.
- An `aria-live` region on the counter: screen readers would announce every keystroke; left out. The counter stays plain text, as FR-013 asks.

## 4. Verification

**Decision**: Verify with `npm run build` from the repository root (production build of `api/` and `web/`, the same command CI runs) and the manual checks in [quickstart.md](quickstart.md). No unit tests: the web workspace has no test runner (the upstream unit tests and their tooling were removed, see `NOTICE`), and adding one for a derived signal would be out of proportion. Browser end-to-end tests are not part of this feature's tasks; they are produced separately from `spec.md`.

**Alternatives considered**: Adding a unit-test runner to `web/` for this change: disproportionate for about 20 changed lines, and a tooling change that this plan's own constraints rule out (plan.md, Constitution Check: no new libraries or configuration).

## 5. Recording the change

**Decision**: Add one line to the `web/` list under "Changes made in this repository" in `NOTICE`, because `README.md` says that file lists every change made to the vendored apps.

**Alternatives considered**: Leaving `NOTICE` alone: would make the list incomplete.
