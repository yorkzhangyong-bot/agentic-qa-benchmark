# Feature Specification: Conduit Social Blogging App

**Feature Branch**: `001-conduit` (no branch created; work is on `main`)

**Created**: 2026-11-10

**Status**: Draft

**Input**: User description:

> Write a Spec Kit-style spec for Conduit, the RealWorld social blogging app in this repository. Cover sign up, sign in and out, settings, global and personal feeds, tags, pagination, article view, create/edit/delete article, comments, favourites, follow, profiles with my-articles and favourited tabs, and error messages for bad input.
>
> Base it on the RealWorld spec, but every requirement must match how this app actually behaves. Each requirement should be testable in the browser, with a concrete expected result (exact text, counts, order, which page you land on), using the seed accounts and data where useful.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read articles without an account (Priority: P1)

A visitor opens Conduit and reads: they browse the Global Feed page by page, narrow it down by tag, open an article and read its comments. Nothing needs an account.

**Why this priority**: Reading is what most visitors do and what every other feature builds on. The app is useful even if nothing else works.

**Independent Test**: Signed out, with the seed data: open the home page, page through the Global Feed, pick the "playwright" tag, open "Flaky tests: a field guide" and read its two comments.

**Acceptance Scenarios**:

1. **Given** the seed data and a signed-out visitor, **When** they open the home page, **Then** the Global Feed lists 10 articles starting with "Release notes for testers", and the page buttons "1", "2" and "3" appear below.
2. **Given** the home page, **When** the visitor clicks page button "3", **Then** the address becomes `/?page=3` and the list shows the 4 oldest articles, ending with "Why we test".
3. **Given** the home page, **When** the visitor clicks "playwright" under Popular Tags, **Then** the address becomes `/tag/playwright`, a "playwright" tab is selected, and the list shows "Exploratory testing sessions that actually find bugs", "Page objects or not?" and "Writing your first end-to-end test".
4. **Given** the Global Feed, **When** the visitor opens "Flaky tests: a field guide", **Then** the article page shows the title, "alice", "January 9, 2026", the tags "testing", "automation" and "ci", and two comments, one by bob and one by erin.
5. **Given** a signed-out visitor on an article page, **When** they look below the article, **Then** they see "Sign in or sign up to add comments on this article." instead of a comment form.

---

### User Story 2 - Create an account, sign in and sign out (Priority: P1)

A visitor signs up with a username, an email address and a password, and is signed in straight away. Later they sign out from the settings page and sign in again with their email address and password.

**Why this priority**: Writing, commenting, favouriting and following all need an account.

**Independent Test**: Sign up as a new user and land on the home page with the new username in the header; sign out from the settings page; sign in again.

**Acceptance Scenarios**:

1. **Given** the sign-up page, **When** the visitor enters a new username, a new email address and a password and clicks "Sign up", **Then** they land on the home page with "Global Feed" selected and their username in the header.
2. **Given** a signed-in user on the settings page, **When** they click "Or click here to logout.", **Then** they land on the home page and the header shows "Home", "Sign in" and "Sign up".
3. **Given** the sign-in page, **When** a user enters `alice@example.com` and `Password123!` and clicks "Sign in", **Then** they land on the home page with "alice" in the header.
4. **Given** the sign-in page, **When** a user enters `alice@example.com` with a wrong password, **Then** the page shows "credentials invalid" and stays on `/login`.

---

### User Story 3 - Write, edit and delete articles (Priority: P1)

A signed-in user writes an article in Markdown with a title, a description and tags, publishes it, edits it later, and deletes it when it's no longer needed.

**Why this priority**: Without articles there is nothing to read, comment on or favourite.

**Independent Test**: Signed in, click "New Article", fill in every field, add two tags and publish; edit the title; delete the article.

**Acceptance Scenarios**:

1. **Given** a signed-in user in the editor, **When** they fill in the title, description and body, add tags and click "Publish Article", **Then** the new article's page opens and the article is first in the Global Feed.
2. **Given** the author on their article's page, **When** they click "Edit Article", change the title and click "Publish Article", **Then** the article page opens at a new address and shows the new title.
3. **Given** the author on their article's page, **When** they click "Delete Article", **Then** the article is deleted without a confirmation, the home page opens, and the article is no longer listed.
4. **Given** a signed-in user in the editor, **When** they click "Publish Article" with every field empty, **Then** the editor shows "title can't be blank", "description can't be blank" and "body can't be blank".

---

### User Story 4 - Follow authors and read a personal feed (Priority: P2)

A signed-in user follows authors they like. "Your Feed" on the home page then lists only articles by the authors they follow.

**Why this priority**: The personal feed is the main reason to come back, but reading works without it.

**Independent Test**: Sign in as erin, who follows nobody: "Your Feed" is empty. Follow bob from his profile: "Your Feed" lists his 6 articles. Unfollow him: it's empty again.

**Acceptance Scenarios**:

1. **Given** erin is signed in, **When** she selects "Your Feed", **Then** it shows "Your feed is empty. Follow some users to see their articles here, or check out the Global Feed!".
2. **Given** erin is on bob's profile, **When** she clicks "Follow bob", **Then** the button changes to "Unfollow bob", and her "Your Feed" lists bob's 6 articles.
3. **Given** alice is signed in, **When** she selects "Your Feed", **Then** it lists the 10 articles by bob and carol, newest first, starting with "Rate limiting in Node without Redis".

---

### User Story 5 - Favourite articles (Priority: P2)

A signed-in user marks articles they like with the heart button. The favourites count goes up, and the article appears in the "Favorited Posts" tab of their profile.

**Why this priority**: Favourites help readers find good articles, but nothing else depends on them.

**Independent Test**: Signed in as alice, favourite "Keyboard navigation checklist" (0 favourites), check that it shows 1 and appears in her "Favorited Posts" tab, then unfavourite it.

**Acceptance Scenarios**:

1. **Given** alice on the page of "Keyboard navigation checklist", **When** she clicks "Favorite Article (0)", **Then** the button changes to "Unfavorite Article (1)".
2. **Given** alice has favourited it, **When** she opens her "Favorited Posts" tab, **Then** "Keyboard navigation checklist" is listed.
3. **Given** a signed-out visitor, **When** they click a heart button in the Global Feed, **Then** they are sent to the sign-up page (`/register`).

---

### User Story 6 - Comment on articles (Priority: P2)

A signed-in user adds comments below an article and deletes their own comments.

**Why this priority**: Comments turn reading into conversation, but articles are readable without them.

**Independent Test**: Signed in, post a comment on an article, see it in the comment list, then delete it with its trash icon.

**Acceptance Scenarios**:

1. **Given** a signed-in user on an article page, **When** they type a comment and click "Post Comment", **Then** the comment appears in the comment list and the comment box is emptied.
2. **Given** the user's own comment, **When** they click its trash icon, **Then** the comment disappears without a confirmation.
3. **Given** a signed-in user on an article page, **When** they click "Post Comment" with an empty box, **Then** the page shows "body can't be blank".

---

### User Story 7 - See a user's profile (Priority: P2)

Anyone opens a user's profile to see their picture, username and bio, the articles they wrote ("My Posts") and the articles they favourited ("Favorited Posts").

**Why this priority**: Profiles connect articles to people and lead to following.

**Independent Test**: Signed out, open alice's profile: 10 of her 12 articles with two page buttons; switch to "Favorited Posts": 6 articles.

**Acceptance Scenarios**:

1. **Given** the seed data, **When** a visitor opens `/profile/alice`, **Then** the page shows "alice", "QA lead. Writes about test strategy and automation.", the "My Posts" tab selected, 10 articles and the page buttons "1" and "2".
2. **Given** alice's profile, **When** the visitor clicks "Favorited Posts", **Then** the address becomes `/profile/alice/favorites` and 6 articles are listed.
3. **Given** erin's profile, **When** a visitor looks at "My Posts", **Then** it shows "No articles are here... yet.".

---

### User Story 8 - Update my settings (Priority: P3)

A signed-in user changes their picture, username, bio, email address or password.

**Why this priority**: Useful, but people can use Conduit for a long time without it.

**Independent Test**: Signed in as alice, change the bio and save: her profile opens with the new bio. Change the password: the old one stops working and the new one works.

**Acceptance Scenarios**:

1. **Given** alice on the settings page, **When** she changes the bio and clicks "Update Settings", **Then** her profile page opens and shows the new bio.
2. **Given** alice on the settings page, **When** she enters a new password of 8 or more characters and saves, **Then** signing in with `Password123!` shows "credentials invalid" and signing in with the new password works.
3. **Given** alice on the settings page, **When** she enters a 5-character password and clicks "Update Settings", **Then** the page shows "password must be at least 8 characters long" and stays on `/settings`.

---

### User Story 9 - Understand what went wrong (Priority: P2)

When a user submits a form with bad input, the app tells them what is wrong, keeps them on the same page with what they typed, and changes nothing.

**Why this priority**: Clear errors keep people from getting stuck on sign-up, sign-in, settings, the editor and comments.

**Independent Test**: Submit each form with the bad inputs listed in the requirements and check each message, the page and the unchanged data.

**Acceptance Scenarios**:

1. **Given** the sign-up page, **When** the visitor enters `not-an-email` as the email address and clicks "Sign up", **Then** the page shows "email is invalid" and the values typed so far are still in the form.
2. **Given** the sign-up page, **When** the visitor signs up with username `alice` and a new email address, **Then** the page shows "username has already been taken", and no account is created.
3. **Given** an article being edited, **When** the author empties the title and clicks "Publish Article", **Then** the editor shows "title String must contain at least 1 character(s)" and the article keeps its old title.

---

### Edge Cases

- A username or password made only of spaces enables the "Sign up" button but is rejected with "can't be blank".
- Every save in the editor gives the article a new address, even when the title is unchanged.
- Emptying a field while editing an article reports "<field> String must contain at least 1 character(s)", while creating an article with an empty field reports "<field> can't be blank".
- Article previews list tags alphabetically; the article page lists them in the order they were added.
- A page number past the last page (for example `/?page=9`) shows "No articles are here... yet." and the page buttons "1", "2" and "3", none of them highlighted.
- An article unfavourited from the "Favorited Posts" tab stays in that list, with an outlined heart, until the page is reloaded.
- A tag typed twice in the editor is added once.
- Deleting an article or a comment happens immediately, without a confirmation.
- HTML script tags in an article body are not run.

## Requirements *(mandatory)*

### Functional Requirements

**Header and home page**

- **FR-001**: When signed out, the header MUST show the Conduit logo and the links "Home", "Sign in" and "Sign up", in that order. The logo and "Home" open the home page (`/`), "Sign in" opens `/login` and "Sign up" opens `/register`.
- **FR-002**: When signed in, the header MUST show the links "Home", "New Article", "Settings" and the user's username next to their avatar, in that order. "New Article" opens `/editor`, "Settings" opens `/settings`, and the username opens `/profile/<username>`.
- **FR-003**: The home page MUST show a banner with the Conduit logo above the article list to signed-out visitors only; signed-in users see no banner.
- **FR-004**: Wherever the app shows the avatar of a user without a profile picture (header, article previews, article pages, comments, profiles), it MUST show the default avatar image `/assets/default-avatar.svg`. In the seed data, carol, dave and erin have no picture.

**Sign up**

- **FR-005**: The sign-up page (`/register`) MUST show the heading "Sign up", a "Have an account?" link to `/login`, the fields "Username", "Email" and "Password", and a "Sign up" button that stays disabled until all three fields contain text.
- **FR-006**: Signing up with a new username, a new email address and a password MUST sign the user in and open the home page (`/`) with "Global Feed" selected and the new username in the header.
- **FR-007**: Signing up with an email address that isn't valid (for example `not-an-email`) MUST show "email is invalid" and stay on `/register`.
- **FR-008**: Signing up with a username or email address that another account already uses MUST be rejected with "username has already been taken" or "email has already been taken" for the field that is taken, stay on `/register` and create no account. Examples: username `alice` with a new email address shows "username has already been taken"; email address `alice@example.com` with a new username shows "email has already been taken".
- **FR-009**: A username or password made only of spaces MUST be rejected with "username can't be blank" or "password can't be blank".

**Sign in and sign out**

- **FR-010**: The sign-in page (`/login`) MUST show the heading "Sign in", a "Need an account?" link to `/register`, the fields "Email" and "Password", and a "Sign in" button that stays disabled until both fields contain text.
- **FR-011**: Signing in with a correct email address and password (for example `alice@example.com` and `Password123!`) MUST open the home page with "Global Feed" selected and the username ("alice") in the header.
- **FR-012**: Signing in with a wrong password or an unknown email address MUST show "credentials invalid" and stay on `/login`.
- **FR-013**: Signing in with an email address that isn't valid MUST show "email is invalid".
- **FR-014**: A signed-in user MUST still be signed in after reloading the page.
- **FR-015**: "Or click here to logout." on the settings page MUST sign the user out and open the home page with the signed-out header and the banner. After a reload the user is still signed out.

**Pages that need an account**

- **FR-017**: A signed-out visitor who opens `/settings`, `/editor`, `/editor/<slug>` or `/?feed=following` MUST be sent to the sign-in page (`/login`).

**Settings**

- **FR-018**: The settings page (`/settings`) MUST show the heading "Your Settings", the fields "URL of profile picture", "Username", "Short bio about you", "Email" and "New Password", and the buttons "Update Settings" and "Or click here to logout.". The fields hold the user's current values, except "New Password", which is empty. For alice: `http://localhost:3000/images/demo-avatar.png`, `alice`, `QA lead. Writes about test strategy and automation.` and `alice@example.com`.
- **FR-019**: "Update Settings" MUST save the changes and open the user's profile page (`/profile/<username>`), which shows the new bio and picture.
- **FR-020**: Emptying "Short bio about you" or "URL of profile picture" and saving MUST remove the bio or picture: the profile shows no bio, and the default avatar appears on the profile and in the header.
- **FR-021**: Changing the username and saving MUST open `/profile/<new username>`, and the header MUST show the new username.
- **FR-022**: Saving with "New Password" empty MUST keep the current password. Saving a new password of at least 8 characters MUST replace it: signing in with the old password then shows "credentials invalid", and the new password signs in.
- **FR-023**: A new password shorter than 8 characters MUST be rejected with "password must be at least 8 characters long", and the user stays on `/settings`.
- **FR-024**: An empty email address MUST be rejected with "email can't be blank", and an email address that isn't valid with "email is invalid".
- **FR-025**: A username made only of spaces MUST be rejected with "username can't be blank".
- **FR-026**: A username or email address that another account already uses MUST be rejected with "username has already been taken" or "email has already been taken" for the field that is taken, and nothing is saved. Examples: alice changing her username to `bob` shows "username has already been taken"; alice changing her email address to `bob@example.com` shows "email has already been taken".

**Global Feed and Your Feed**

- **FR-027**: The home page MUST list articles in the "Global Feed" tab, newest first, 10 per page. With the seed data, page 1 starts with "Release notes for testers" (alice, January 28, 2026) and ends with "Migrating a Node service to ESM" (bob), page 2 starts with "Markdown cheat sheet for Conduit authors", and page 3 lists the 4 oldest articles: "Accessible forms in Angular", "Writing your first end-to-end test", "SQLite is enough for most side projects" and "Why we test".
- **FR-028**: Each article preview MUST show the author's avatar and username (both linking to `/profile/<username>`), the publication date in the form "January 28, 2026", a heart button with the number of favourites, the title, the description, "Read more..." and the article's tags in alphabetical order. Example: "Flaky tests: a field guide" shows 4 favourites and the tags "automation", "ci" and "testing".
- **FR-029**: Clicking an article's title in a preview MUST open the article page (`/article/<slug>`).
- **FR-030**: The feed tabs MUST be "Global Feed" alone for signed-out visitors, and "Your Feed" followed by "Global Feed" for signed-in users. The home page opens with "Global Feed" selected, including right after signing in or signing up.
- **FR-031**: "Your Feed" (`/?feed=following`) MUST list only articles by the users the signed-in user follows, newest first, 10 per page. With the seed data, alice's feed lists the 10 articles by bob and carol on one page, starting with "Rate limiting in Node without Redis" and ending with "SQLite is enough for most side projects".
- **FR-032**: With the seed data, "Your Feed" MUST show 12 articles for bob (page buttons "1" and "2"), 18 for carol ("1" and "2") and 22 for dave ("1", "2" and "3").
- **FR-033**: When the user follows nobody, "Your Feed" MUST show "Your feed is empty. Follow some users to see their articles here, or check out the Global Feed!", where "Global Feed" links to the home page, and no page buttons. In the seed data, erin follows nobody.

**Tags**

- **FR-034**: The "Popular Tags" sidebar MUST list the 10 most used tags, most used first. With the seed data: "testing", "automation", "sqlite", "nodejs", "angular", "ci", "career", "playwright", "performance", "accessibility". "security", used by one article, is not listed.
- **FR-035**: Clicking a tag MUST open `/tag/<tag>`, add a third tab showing the tag name, selected, after "Global Feed", and list only the articles with that tag, newest first. Example: "playwright" lists "Exploratory testing sessions that actually find bugs", "Page objects or not?" and "Writing your first end-to-end test".
- **FR-036**: Tag pages MUST also work when opened by address: `/tag/security` lists "Backups for SQLite, the boring way", and a tag no article uses (for example `/tag/nonexistent`) shows "No articles are here... yet." and no page buttons.
- **FR-037**: Clicking "Global Feed" on a tag page MUST open `/` and remove the tag tab.

**Pagination**

- **FR-038**: Every article list MUST show page buttons numbered from 1 to the number of pages (the article count divided by 10, rounded up), with the current page highlighted, and no buttons when the list is empty. Examples: the Global Feed shows "1", "2" and "3"; `/tag/testing`, with exactly 10 articles, shows only "1".
- **FR-039**: Clicking a page button MUST show that page's articles, highlight the button and put the page number in the address (`/?page=2`); page 1 has no page number in the address. Opening such an address directly MUST show that page: `/?page=2` starts with "Markdown cheat sheet for Conduit authors".
- **FR-040**: Paging through "Your Feed" MUST keep the feed in the address: on bob's feed, page button "2" opens `/?feed=following&page=2`, which lists 2 articles.
- **FR-041**: Profile tabs MUST page the same way: page 2 of alice's "My Posts" lists "Writing your first end-to-end test" and "Why we test".

**Article page**

- **FR-042**: The article page (`/article/<slug>`) MUST show the title as the heading, the author's avatar, username and publication date, the body rendered from Markdown, and the article's tags in the order they were added. Example: "Flaky tests: a field guide" by alice, January 9, 2026, with the tags "testing", "automation" and "ci".
- **FR-043**: Article bodies MUST be rendered as Markdown. Example: "Markdown cheat sheet for Conduit authors" shows the section headings "Headings", "Lists", "Code" and "Quotes and links", a bulleted list, a numbered list, a code block, the quote "Quality is never an accident." and a "home page" link to `/`.
- **FR-044**: HTML script tags in an article body MUST NOT be run, while the rest of the body is still rendered (for example, `**bold**` appears in bold).
- **FR-045**: The author MUST see "Edit Article" and "Delete Article" twice on their own article's page: under the title and below the body. Everyone else, signed in or not, MUST see "Follow <author>" (or "Unfollow <author>") and "Favorite Article (<count>)" (or "Unfavorite Article (<count>)") in both places instead. Example: signed out, "Flaky tests: a field guide" shows "Follow alice" and "Favorite Article (4)".

**Writing articles**

- **FR-047**: The editor (`/editor`, opened with "New Article") MUST show the fields "Article Title", "What's this article about?", "Write your article (in markdown)" and "Enter tags", and a "Publish Article" button.
- **FR-048**: Typing a tag and pressing Enter MUST add it as a tag below the field and empty the field. A tag already in the list or made only of spaces is not added again, clicking the × next to a tag removes it, and text left in the tag field when publishing is added as a tag.
- **FR-049**: "Publish Article" MUST create the article and open its page at `/article/<slug>`, where the slug is the title with spaces replaced by hyphens, then a hyphen and 8 random characters (for example `Zebra-tags-test-ee1a5998`). The article is then first in the Global Feed and in the author's "My Posts" tab.
- **FR-050**: Publishing with an empty title, description or body MUST show one message per empty field, out of "title can't be blank", "description can't be blank" and "body can't be blank", stay on `/editor` and create no article.
- **FR-051**: "Edit Article" MUST open `/editor/<slug>` with the title, description, body and tags (in the order they were added) filled in.
- **FR-052**: "Publish Article" in the editor for an existing article MUST save the changes and open the article page showing them. Every save MUST give the article a new address: the slug keeps the title part and gets 8 new random characters, even when the title is unchanged.
- **FR-053**: Emptying the title, description or body of an existing article and clicking "Publish Article" MUST show one message per emptied field, in the form "title String must contain at least 1 character(s)", and stay in the editor without saving.
- **FR-054**: Opening the editor for another user's article (`/editor/<their slug>`) MUST open the home page instead.
- **FR-055**: "Delete Article" MUST delete the article immediately, without a confirmation, and open the home page. The article no longer appears in any list.

**Comments**

- **FR-056**: The article page MUST list the article's comments below the body, each with its text, the commenter's avatar and username (linking to their profile) and the date. Example: "Exploratory testing sessions that actually find bugs" lists 5 comments, two by bob and one each by carol, dave and erin, all dated January 27, 2026, including "We tried this last sprint and found three bugs in the editor.".
- **FR-057**: Signed-out visitors MUST see "Sign in or sign up to add comments on this article." instead of the comment form, where "Sign in" links to `/login` and "sign up" to `/register`.
- **FR-058**: Signed-in users MUST see a comment box with the placeholder "Write a comment...", their avatar and a "Post Comment" button. Posting MUST add the comment to the list straight away, under the user's username, and empty the box. The comment is still listed after a reload.
- **FR-059**: Posting an empty comment, or one made only of spaces, MUST show "body can't be blank" and add nothing.
- **FR-060**: A trash icon MUST appear only on the signed-in user's own comments. Clicking it MUST delete the comment immediately, without a confirmation, and the comment stays deleted after a reload.

**Favourites**

- **FR-061**: The heart button in article previews MUST be outlined when the signed-in user hasn't favourited the article and filled when they have. Clicking it MUST toggle between the two, adding or removing one favourite from the count shown. Example: for alice, "Keyboard navigation checklist" goes from an outlined 0 to a filled 1, and back.
- **FR-062**: On the article page, "Favorite Article (<count>)" MUST change to "Unfavorite Article (<count + 1>)" when clicked, in both places, and back again when clicked again. Example: "Keyboard navigation checklist" goes from "Favorite Article (0)" to "Unfavorite Article (1)".
- **FR-063**: A user's "Favorited Posts" tab MUST list the articles they favourited, newest first, including ones favourited a moment ago. An article unfavourited there stays listed until the page is reloaded.
- **FR-064**: A signed-out visitor who clicks a heart button or "Favorite Article" MUST be sent to the sign-up page (`/register`).

**Following**

- **FR-065**: Other users' profiles and articles MUST show an outlined "Follow <username>" button, or a filled "Unfollow <username>" button if the signed-in user already follows them. Clicking it MUST toggle between the two. Examples: erin sees "Follow bob" on bob's profile; alice sees "Unfollow bob" on bob's articles.
- **FR-066**: Following a user MUST add their articles to the follower's "Your Feed", and unfollowing MUST remove them. Example: after erin follows bob, her feed lists bob's 6 articles on one page; after she unfollows him, it's empty again.
- **FR-067**: A signed-out visitor who clicks a Follow button MUST be sent to the sign-in page (`/login`).
- **FR-068**: Users MUST NOT see a Follow button for themselves: their own profile shows an "Edit Profile Settings" link to `/settings` instead, and their own articles show "Edit Article" and "Delete Article".

**Profiles**

- **FR-069**: The profile page (`/profile/<username>`) MUST show the user's avatar, username and bio, and two tabs: "My Posts", selected at `/profile/<username>` and listing the articles the user wrote, newest first; and "Favorited Posts", selected at `/profile/<username>/favorites` and listing the articles the user favourited, newest first.
- **FR-070**: With the seed data, profiles MUST show these counts. alice has 12 posts (page buttons "1" and "2") and 6 favourited; bob 6 posts; carol 4; dave 2, with no bio and the default avatar; and erin 0 posts ("No articles are here... yet.") and 11 favourited (page buttons "1" and "2").

**Error messages**

- **FR-073**: Form errors MUST appear as a list above the form, one line per field, in the form "<field> <message>" (for example "email is invalid"), and the values typed so far MUST stay in the form.

### Key Entities

- **User**: A registered account: unique username, unique email address, password, and an optional bio and profile picture URL. Signs in with email address and password.
- **Profile**: The public view of a user: username, bio, picture, and whether the signed-in user follows them.
- **Article**: Written by one user. Has a title, a description, a Markdown body, a list of tags, a publication date and an address (slug) derived from the title. Shows how many users favourited it.
- **Comment**: Text written by one user on one article, with a date.
- **Tag**: A label on articles. Popular Tags shows the 10 used by the most articles.
- **Favourite**: A user marking an article they like.
- **Follow**: A user following another user, whose articles then appear in the follower's "Your Feed".

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Paging through the Global Feed from page 1 to page 3 shows all 24 seeded articles exactly once, newest first, from "Release notes for testers" to "Why we test".
- **SC-002**: Each of the 5 seeded accounts (alice, bob, carol, dave and erin, all with `Password123!`) can sign in and sees its username in the header, and their "Your Feed" lists 10, 12, 18, 22 and 0 articles respectively.
- **SC-003**: In one browser session, a new user can sign up, publish an article with two tags, comment on it and favourite it, and then find it in their "My Posts" and "Favorited Posts" tabs and first in the Global Feed.
- **SC-004**: Every bad input described in FR-007 to FR-009, FR-012, FR-013, FR-023 to FR-026, FR-050, FR-053 and FR-059 shows the stated message and keeps the user on the same page, and none of them changes any data: afterwards the Global Feed still lists 24 articles and alice still signs in with `Password123!`.
- **SC-005**: Favourite counts agree everywhere: after a user favourites an article, its count is 1 higher in the Global Feed and on the article page, and the article is in their "Favorited Posts" tab. After they unfavourite it, the count is back to the seeded value in both places and, after a reload, the article is gone from the tab.
- **SC-006**: Following round-trips: erin's "Your Feed" goes from empty to bob's 6 articles after she follows bob, and back to empty after she unfollows him.
- **SC-007**: A signed-out visitor can open every list, article and profile, but every action that needs an account sends them to sign in or sign up (FR-017, FR-057, FR-064 and FR-067), with no exceptions.
- **SC-008**: Changes are kept: after a user signs out and signs in again, their profile changes, articles, comments, favourites and follows are all still shown.
- **SC-009**: Every article list (Global Feed, Your Feed, tag pages, "My Posts" and "Favorited Posts") is ordered newest first by the date shown in its previews.
- **SC-010**: The app works without internet access: no page in the flows above loads anything from another host, including icons and fonts.

## Assumptions

- Expected results assume the seed data, which `npm run setup` loads into a new database and `npm run db:reset` restores:
  - 5 accounts, all with the password `Password123!`: alice, bob, carol, dave and erin, with email addresses `<username>@example.com`.
  - Follows: alice follows bob and carol; bob follows alice; carol follows alice and bob; dave follows alice, bob and carol; erin follows nobody.
  - 24 articles, one a day from 5 to 28 January 2026: 12 by alice, 6 by bob, 4 by carol and 2 by dave. 11 tags, 14 comments and 39 favourites.
- Scenarios that change data assume the seed data as it is after a reset, not as left by an earlier scenario.
- The web app runs at `http://localhost:4200` and its API at `http://localhost:3000`. The seeded profile pictures of alice and bob are served by the API.
- Dates are shown in US English (for example "January 28, 2026"). New articles and comments show the current date.
- Where this app differs from the RealWorld spec, the requirements describe this app. Notably, the profile tabs are "My Posts" and "Favorited Posts" rather than "My Articles" and "Favorited Articles". Favouriting while signed out leads to the sign-up page, while following leads to the sign-in page. Errors read "<field> <message>".
- Out of scope, as in the RealWorld spec: editing comments, deleting accounts, password reset and email verification.

## Known upstream behaviour (not specified)

The current app, as taken from upstream, also behaves as follows. This is noted so it doesn't come as a surprise. It is not required, and a correct app may behave differently. FR-016, FR-046, FR-071 and FR-072 were retired because they described only this behaviour.

- A sign-up or settings change that reuses another account's username or email address currently shows both "email has already been taken" and "username has already been taken", even when only one of them is taken.
- Comments currently load oldest first, while a newly posted comment is added at the top of the list, so after a reload it moves to the bottom.
- After an article is edited, its old address currently shows only the header and footer.
- A missing article (such as `/article/does-not-exist` or a deleted article's address) and a missing profile (such as `/profile/nobody`) currently show only the header and footer, without an error message. So do an unknown address (such as `/no-such-page`) and `/login` or `/register` opened while signed in, whose addresses also change to `/`.
