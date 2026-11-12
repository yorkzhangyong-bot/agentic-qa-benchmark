# UI Contract: Comment form on the article page

**Feature**: [../spec.md](../spec.md) | **Date**: 2026-11-12

This feature exposes no new API. The only interface that changes is the comment form rendered on `/article/<slug>` for signed-in users. This contract fixes what the page renders, so that the implementation and its review agree on it.

## Rendered structure (signed in)

```html
<form class="card comment-form">
  <fieldset>                                                      <!-- disabled while a post is in flight; unchanged -->
    <div class="card-block">
      <textarea class="form-control" placeholder="Write a comment..." rows="3" maxlength="500"></textarea>
      <small class="comment-counter">0/500</small>                <!-- NEW: directly under the box -->
    </div>
    <div class="card-footer">
      <img class="comment-author-img" src="...">                  <!-- unchanged -->
      <button class="btn btn-sm btn-primary" type="submit">Post Comment</button>   <!-- unchanged -->
    </div>
  </fieldset>
</form>
```

| Item | Contract |
|---|---|
| Counter element | One element with the class `comment-counter`, inside `.comment-form .card-block`, immediately after the textarea; plain text, not a link, field or button |
| Counter text | Exactly `<N>/500`, where N is the textarea value's length in UTF-16 code units, written without leading zeros; no other text in the element |
| Initial text | `0/500` when the page opens and after a reload |
| Update timing | Changes on every `input` event of the textarea and whenever the app sets or resets the control; no blur or extra key needed |
| Textarea | Gains `maxlength="500"`; its class, placeholder and `rows` are unchanged |
| Upper bound | The textarea value never exceeds 500 code units through user editing; the counter never shows a number above 500 |
| After a successful post | Textarea value `''`, counter `0/500` (the existing `reset('')`) |
| After a failed post | Textarea value and counter unchanged; the error list above the form shows the API message, as today |
| Signed out | Neither the form nor the counter is rendered; "Sign in or sign up to add comments on this article." is unchanged |

## API (unchanged)

`POST /api/articles/{slug}/comments` with `{ "comment": { "body": "<text>" } }` keeps its current behaviour: `body` is trimmed and must not be empty (error `body can't be blank`); there is no maximum length (spec Assumptions, decision 5). `GET /api/articles/{slug}/comments` and `DELETE /api/articles/{slug}/comments/{id}` are untouched.
