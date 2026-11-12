# Feature Specification: Comment Character Counter

**Feature Branch**: `feature/comment-character-counter` (feature directory `specs/002-comment-character-counter`)

**Created**: 2026-11-12

**Status**: Draft

**Input**: User description:

> Add a character counter under the comment box on the article page, showing how many characters are typed, with a maximum of 500.

This spec extends the Conduit spec in `specs/001-conduit/spec.md`, whose FR-056 to FR-060 describe comments as they work today. It changes FR-058, the comment box: the box gets a character counter and a limit of 500 characters. Everything else about comments stays as specified there.

**Where this happens**: Every article has a page at `/article/<slug>`, opened by clicking the article's title in a feed. Below the article body, signed-in users see the comment form: a comment box with the placeholder "Write a comment...", their avatar and a "Post Comment" button. Signed-out visitors see "Sign in or sign up to add comments on this article." instead. Today the box has no counter and no length limit.

**Test data**: The seed data (loaded by `npm run setup`, restored by `npm run db:reset`) has the account alice, email `alice@example.com`, password `Password123!` (every seeded account has this password). Sign in at `http://localhost:4200/login`. Her article "Markdown cheat sheet for Conduit authors" is at `/article/Markdown-cheat-sheet-for-Conduit-authors-dfc9b07f`, is the first article on page 2 of the Global Feed (`/?page=2`) and has no comments, so a comment posted there while testing is easy to find and to delete again. Any signed-in account and any article behave the same.

**Test texts**: Every scenario names its exact input. A text in quotation marks is typed or pasted exactly as written, without the quotation marks. `"a" x500` means the letter a repeated 500 times and nothing else; `"a" x500 followed by "b" x100` means one text of 600 characters: 500 a, then 100 b. Expected counts are written as the counter shows them, for example "12/500".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See how long my comment is (Priority: P1)

A signed-in user writing a comment sees, right under the comment box, how many characters they have typed and that the limit is 500. The number follows every change to the box.

**Why this priority**: It is the feature itself: without the counter, nothing of this feature is visible.

**Independent Test**: Sign in as alice, open "Markdown cheat sheet for Conduit authors", see "0/500" under the empty comment box, type "Hello world!" and see "12/500", delete the text and see "0/500" again.

**Acceptance Scenarios**:

1. **Given** alice is signed in and opens `/article/Markdown-cheat-sheet-for-Conduit-authors-dfc9b07f`, **When** she looks under the empty comment box, **Then** she sees "0/500" inside the comment form, between the box and the row with her avatar and "Post Comment".
2. **Given** the empty comment box, **When** alice types "Hello world!", **Then** the counter reads "12/500" as soon as the last character is typed, without clicking elsewhere.
3. **Given** the box contains "Hello world!", **When** alice deletes "world!" with Backspace, **Then** the counter reads "6/500" (the space after "Hello" still counts).
4. **Given** the empty comment box, **When** alice pastes "a" x120 into it, **Then** the box contains those 120 a and the counter reads "120/500".
5. **Given** a signed-out visitor on the same article page, **When** they look below the article, **Then** they see "Sign in or sign up to add comments on this article." and no counter.

---

### User Story 2 - Stay within the 500-character limit (Priority: P1)

The comment box takes at most 500 characters. A user who reaches the limit sees "500/500" and cannot type more, and a paste adds only as many characters as still fit. A comment of exactly 500 characters posts like any other.

**Why this priority**: The limit is the other half of the request; the counter is only meaningful if 500 really is the maximum.

**Independent Test**: Signed in as alice on her article, paste "a" x500 followed by "b" x100 (600 characters) into the empty box: the box keeps exactly the 500 a and no b, the counter reads "500/500", typing "b" adds nothing, and "Post Comment" lists a comment whose text is exactly those 500 a, after which the box is empty and the counter reads "0/500".

**Acceptance Scenarios**:

1. **Given** the empty comment box, **When** alice pastes "a" x500 followed by "b" x100 (600 characters), **Then** the box contains exactly the 500 a and no b (the first 500 characters of the pasted text) and the counter reads "500/500".
2. **Given** the box holds "a" x500 and the counter reads "500/500", **When** alice types "b", **Then** nothing is added: the box still contains exactly the 500 a and the counter stays at "500/500".
3. **Given** the box holds "a" x499 and the counter reads "499/500", **When** alice types "b", **Then** the b is added after the 499 a and the counter reads "500/500".
4. **Given** the box holds "a" x490 and the counter reads "490/500", **When** alice pastes "abcdefghijklmnopqrst" at the end, **Then** only "abcdefghij" is added, so the box holds 500 characters ending in "abcdefghij", and the counter reads "500/500".
5. **Given** the box holds exactly "a" x500 and the counter reads "500/500", **When** alice clicks "Post Comment", **Then** a comment whose text is exactly those 500 a appears in the comment list under the username alice, the box is empty and the counter reads "0/500".

---

### User Story 3 - The counter stays right after posting, errors and reloads (Priority: P2)

Whatever empties or changes the box, the counter matches the box: after a comment is posted, after a post that failed, after cutting text, and after the page is reloaded.

**Why this priority**: A counter that is wrong after posting would mislead the next comment, but this only matters once the counter and the limit exist.

**Independent Test**: Signed in as alice on her article, type "Nice summary." (counter "13/500") and click "Post Comment": a comment with the text "Nice summary." is listed and the counter reads "0/500". Type three spaces (counter "3/500") and click "Post Comment": the page shows "body can't be blank" and the counter still reads "3/500". Reload the page: the box is empty and the counter reads "0/500".

**Acceptance Scenarios**:

1. **Given** alice has typed "Nice summary." (13 characters) and the counter reads "13/500", **When** she clicks "Post Comment", **Then** a comment with the text "Nice summary." appears in the list under the username alice, the box is empty and the counter reads "0/500".
2. **Given** the box contains three spaces and the counter reads "3/500", **When** alice clicks "Post Comment", **Then** the page shows "body can't be blank", no comment is added, the three spaces are still in the box and the counter still reads "3/500".
3. **Given** the box contains "Hello world!" and the counter reads "12/500", **When** alice selects all of the text (Ctrl+A) and cuts it (Ctrl+X), **Then** the box is empty and the counter reads "0/500".
4. **Given** the box contains "Hello world!" and the counter reads "12/500", **When** alice reloads the page, **Then** the box is empty and the counter reads "0/500".

---

### Edge Cases

- A line break counts as one character: typing "a", Enter, "b" shows "3/500".
- An emoji such as 😀 counts as two characters, because the count is the browser's own length of the text (see Assumptions, decision 2), and the box is full exactly when the count reaches 500. "😀" alone shows "2/500", and the box holds at most 250 such emoji: pasting "😀" x250 into the empty box shows "500/500".
- Pasting when the box is nearly full adds only the characters that fit, taken from the start of the pasted text, and the counter never goes above "500/500": with "a" x490 in the box, pasting "abcdefghijklmnopqrst" adds only "abcdefghij". A character that only partly fits is not added: with "a" x499 in the box ("499/500"), pasting "😀" leaves the box unchanged and the counter at "499/500".
- Replacing a selection works like deleting and typing: with "a" x500 in the box, selecting the last 10 a and typing "b" gives "491/500".
- Undo follows the box: paste "Hello world!" into the empty box ("12/500"), then press Ctrl+Z: the box is empty and the counter reads "0/500".
- While a comment is being posted, the form is disabled and the counter keeps its number: while "Nice summary." is being posted the counter reads "13/500"; once the comment is posted, it reads "0/500".
- The limit applies to the comment box only (see Assumptions, decision 5). A longer comment that another client posts straight to the API, for example "a" x600 sent by a signed-in user to `POST http://localhost:3000/api/articles/<slug>/comments`, is listed with the same text, as today; as today, leading and trailing spaces and line breaks are not kept.
- The counter is never shown to signed-out visitors, on any article page.

## Requirements *(mandatory)*

### Functional Requirements

**Where the counter appears**

- **FR-001**: On every article page (`/article/<slug>`), signed-in users MUST see a character counter inside the comment form, directly under the comment box (the box with the placeholder "Write a comment...") and above the row with their avatar and the "Post Comment" button. It is shown whenever the comment form is shown.
- **FR-002**: Signed-out visitors MUST see "Sign in or sign up to add comments on this article." instead of the comment form, as today, and no counter.

**What the counter shows**

- **FR-003**: The counter MUST read exactly "<N>/500", where N is the number of characters currently in the comment box, written as a plain number without leading zeros: "0/500" for an empty box, "12/500" after typing "Hello world!", "500/500" when the box is full.
- **FR-004**: N MUST count every character in the box, including spaces, punctuation and line breaks, each line break counting as one. A character the browser counts as two, such as the emoji 😀, adds two to N. The box is full exactly when N reaches 500 (FR-006), so the counter and the limit always agree.
- **FR-005**: The counter MUST follow every change to the box's content as soon as it happens: typing, deleting, cutting, pasting, undo, replacing a selection, and the app emptying the box. The user MUST NOT need to click elsewhere, press another key or wait for the number to update.

**The limit**

- **FR-006**: The comment box MUST NOT accept more than 500 characters. When the box holds 500, typing adds nothing. Pasting adds only as many characters as still fit, taken from the start of the pasted text: pasting "a" x500 followed by "b" x100 into the empty box leaves exactly the 500 a in it; with "a" x490 in the box, pasting "abcdefghijklmnopqrst" adds only "abcdefghij". A character that only partly fits, such as 😀 when one place is left, is not added: with "a" x499 in the box, pasting "😀" leaves the box unchanged and the counter at "499/500".
- **FR-007**: The counter MUST never show a number above 500; when the box is full it reads "500/500".
- **FR-008**: Posting a comment of exactly 500 characters MUST work like any other comment: it is listed with the same text, and the box is emptied. Posting "a" x500 lists a comment whose text is exactly those 500 a. As today, leading and trailing spaces and line breaks are not kept in the listed comment.

**After posting, after errors and on load**

- **FR-009**: After a comment is posted, the box is emptied (FR-058 of the Conduit spec) and the counter MUST read "0/500" again, without a reload.
- **FR-010**: When posting fails, for example with "body can't be blank" for a comment made only of spaces (FR-059 of the Conduit spec), the box MUST keep its content and the counter MUST keep its number.
- **FR-011**: Opening or reloading an article page MUST show an empty comment box and "0/500".

**What stays the same**

- **FR-012**: Everything else about comments MUST stay as described in FR-056 to FR-060 of the Conduit spec, that is: the article page lists the article's comments below the body, each with its text, the commenter's avatar and username (linking to their profile) and the date; signed-out visitors see "Sign in or sign up to add comments on this article." instead of the form, where "Sign in" links to `/login` and "sign up" to `/register`; posting adds the comment to the list straight away, under the user's username, and the comment is still listed after a reload; posting an empty comment, or one made only of spaces, shows "body can't be blank" and adds nothing; a trash icon appears only on the signed-in user's own comments, clicking it deletes the comment immediately without a confirmation, and the comment stays deleted after a reload.
- **FR-013**: The counter MUST be plain text, not a field, a link or a button, in a smaller font than the text in the comment box. Colour and typeface are not specified. Apart from the counter's own line, nothing on the article page is added, removed or restyled.

### Key Entities

- **Comment**: Text written by one user on one article, with a date (as in the Conduit spec). When written in the comment box, the text is at most 500 characters long.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On every article page, a signed-in user sees "0/500" before typing, and after typing or pasting any text the counter equals the number of characters in the box: into the empty box, typing "a" shows "1/500", typing "Hello world!" shows "12/500", pasting "a" x120 shows "120/500", pasting "a" x499 shows "499/500" and pasting "a" x500 shows "500/500".
- **SC-002**: Nobody can get more than 500 characters into the comment box, whether by typing or by pasting any amount of text, and the counter never shows a number above 500.
- **SC-003**: A comment of exactly 500 characters ("a" x500) posts successfully and is listed with the same text; as today, leading and trailing spaces and line breaks are not kept. After every successful post the counter is back at "0/500" without a reload.
- **SC-004**: Signed-out visitors see no counter on any article page, and the sign-in prompt is unchanged.
- **SC-005**: Every comment behaviour in FR-056 to FR-060 of the Conduit spec still works, checked with the seed data: signed in as alice, `/article/Exploratory-testing-sessions-that-actually-find-bugs-262d883c` still lists its 5 comments (two by bob and one each by carol, dave and erin), none of them with a trash icon, and the counter under the empty box reads "0/500"; on alice's article, posting "Nice summary." adds it to the list straight away under the username alice, and it is still listed after a reload; a comment made only of spaces still shows "body can't be blank" and adds nothing; alice's own comment "Nice summary." shows a trash icon, clicking it deletes the comment immediately without a confirmation, and it stays deleted after a reload; signed out, "Sign in" in the sign-in prompt links to `/login` and "sign up" to `/register`.

## Assumptions

The feature description leaves several details open. The decisions below were taken without asking and are recorded here so that they can be reviewed and overruled. Decisions 1 to 4 and 6 are written as testable requirements above; decision 5 records what is out of scope.

1. **Placement** (FR-001, FR-002): The counter sits directly under the comment box, inside the comment form, above the row with the avatar and "Post Comment". It is visible whenever the comment form is visible, that is for signed-in users only. Signed-out visitors keep seeing the sign-in prompt and no counter.
2. **Format and counting** (FR-003, FR-004): The counter reads "N/500", where N is the number of characters currently in the box: "0/500" when empty, "12/500" after typing 12 characters. Every character counts, including spaces and line breaks. N is the count the browser itself uses for a text box's maximum length (UTF-16 code units), so the box is full exactly when N reaches 500; an emoji such as 😀 counts as two, a line break as one.
3. **Always current** (FR-005, FR-009 to FR-011): The counter reflects the box's content at all times: typing, deleting, pasting, cutting, undo and the app emptying the box. After a successful post the box is emptied, as FR-058 of the Conduit spec already requires, and the counter reads "0/500" again.
4. **Hard maximum** (FR-006 to FR-008): The box accepts at most 500 characters. Typing or pasting past 500 is cut off at 500, a character that only partly fits is not added, and the counter never shows more than "500/500". Posting a comment of exactly 500 characters works normally: it is listed with the same text; as today, leading and trailing spaces and line breaks are not kept.
5. **Out of scope**: The server does not enforce the limit (no API change). The limit is enforced in the browser only: the server keeps accepting comments of any length from other clients (today it rejects only empty ones), and such comments are listed as today. Also out of scope: editing comments, and any change to how comments are listed.
6. **No visual redesign** (FR-013): The counter is plain text in a smaller font than the comment box text. Colour and typeface are not specified. Apart from its own line, nothing on the page is added, removed or restyled.

Other assumptions:

- Expected results assume the seed data, which `npm run setup` loads into a new database and `npm run db:reset` restores: 5 accounts (alice, bob, carol, dave and erin) with email addresses `<username>@example.com` and the password `Password123!`; alice's article "Markdown cheat sheet for Conduit authors" at `/article/Markdown-cheat-sheet-for-Conduit-authors-dfc9b07f`, first on page 2 of the Global Feed, with no comments; and "Exploratory testing sessions that actually find bugs" at `/article/Exploratory-testing-sessions-that-actually-find-bugs-262d883c` with 5 comments.
- Scenarios that post comments assume the seed data as it is after a reset, not as left by an earlier scenario. A comment posted while testing can be deleted again with its trash icon.
- The web app runs at `http://localhost:4200` (sign in at `http://localhost:4200/login`) and its API at `http://localhost:3000`.
- Alice and her article are suggested only because they are easy to find; any signed-in account and any article page behave the same.
- "Characters" means what the browser counts (decision 2). The spec does not count bytes, words or grapheme clusters.
