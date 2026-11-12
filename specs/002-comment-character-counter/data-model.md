# Data Model: Comment Character Counter

**Feature**: [spec.md](spec.md) | **Date**: 2026-11-12

## Stored data

No change. The feature adds no entity, field, migration or API change.

- **Comment** (unchanged; Prisma model in `api/prisma/schema.prisma`, API shape in `api/server/models/comment.model.ts`): `id`, `body`, `createdAt`, `updatedAt`, author, article. The API keeps validating `body` with `z.string().trim().min(1, "can't be blank")` in `api/server/schemas/comment.schema.ts`: no maximum length. The 500-character limit exists only in the comment box, as recorded in the spec's Assumptions (decision 5).

## Component state (web)

`ArticleComponent` in `web/src/app/features/article/pages/article/article.component.ts`:

| State | Type | Today | After this feature |
|---|---|---|---|
| `commentControl` | `FormControl<string>`, non-nullable, starts at `''` | Holds the comment box text; `reset('')` after a successful post | Unchanged. The textarea's new `maxlength="500"` keeps the value at 500 characters or fewer whenever the user edits it |
| `commentLength` | `Signal<number>` (new) | n/a | Derived from `commentControl.valueChanges`; equals `commentControl.value.length` at all times, starting at 0 |

### Validation rules (from the spec)

- `commentLength()` is the number of UTF-16 code units in the box (FR-004): spaces, punctuation and line breaks count 1 each; an emoji such as 😀 counts 2.
- `0 <= commentLength() <= 500` for every value produced by user editing (FR-006, FR-007).
- The rendered counter text is `${commentLength()}/500` (FR-003), with no other text.

### State transitions

| Event | `commentControl.value` | `commentLength()` | Counter text |
|---|---|---|---|
| Page opens, signed in | `''` | 0 | `0/500` |
| User types, deletes, cuts, pastes, undoes, replaces a selection | new value, at most 500 code units | length of the value | `<N>/500` |
| User types with 500 in the box, or pastes more than fits | unchanged, or grows only up to 500 | unchanged, or 500 | `500/500` |
| "Post Comment" succeeds | `''` (existing `reset('')`) | 0 | `0/500` |
| "Post Comment" fails (for example "body can't be blank") | unchanged | unchanged | unchanged |
| Page reloads | `''` | 0 | `0/500` |

Signed-out visitors: the comment form, including the counter, is not rendered (`*ifAuthenticated="true"` around the form), unchanged from today.
