/**
 * Deterministic seed data for the Conduit benchmark app.
 *
 * Run it from the repo root with `npm run db:reset`, which deletes the SQLite file,
 * recreates the schema and then runs this script. Every run produces the same users,
 * articles, tags, comments, favourites, follows and timestamps.
 *
 * The test accounts are documented in the root README.
 */
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import slugify from 'slugify';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../generated/prisma/client';

const PASSWORD = 'Password123!';
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
// Avatars are served by the API itself, from api/server/public/images.
const IMAGES = 'http://localhost:3000/images';
// Article i (0-based, oldest first) is published FIRST_ARTICLE_AT + i days; comment k on it k+1 hours later.
const FIRST_ARTICLE_AT = Date.UTC(2026, 0, 5, 9, 0, 0);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

type Username = 'alice' | 'bob' | 'carol' | 'dave' | 'erin';

const users: { username: Username; bio: string | null; image: string | null }[] = [
  { username: 'alice', bio: 'QA lead. Writes about test strategy and automation.', image: `${IMAGES}/demo-avatar.png` },
  { username: 'bob', bio: 'Backend developer who likes SQLite more than he should.', image: `${IMAGES}/smiley-cyrus.jpeg` },
  { username: 'carol', bio: 'Frontend engineer working on Angular and accessibility.', image: null },
  { username: 'dave', bio: null, image: null },
  { username: 'erin', bio: 'Just joined. Reading, not writing yet.', image: null },
];

// follower -> the users they follow
const follows: Record<Username, Username[]> = {
  alice: ['bob', 'carol'],
  bob: ['alice'],
  carol: ['alice', 'bob'],
  dave: ['alice', 'bob', 'carol'],
  erin: [],
};

interface SeedArticle {
  author: Username;
  title: string;
  description: string;
  body: string;
  tags: string[];
  favoritedBy: Username[];
  comments?: { author: Username; body: string }[];
}

const paragraphs = (...lines: string[]) => lines.join('\n\n');

// Oldest first. The global feed shows them newest first, 10 per page.
const articles: SeedArticle[] = [
  {
    author: 'alice',
    title: 'Why we test',
    description: 'A short manifesto for a small QA team',
    body: paragraphs(
      'Testing is how a team learns what its software really does, as opposed to what everyone hopes it does.',
      'We test to find out early, while a fix is still cheap, and to give everyone the confidence to change code without fear.',
    ),
    tags: ['testing', 'career'],
    favoritedBy: ['bob', 'carol', 'erin'],
    comments: [{ author: 'bob', body: 'Printed this and pinned it next to the coffee machine.' }],
  },
  {
    author: 'bob',
    title: 'SQLite is enough for most side projects',
    description: 'You probably do not need a database server yet',
    body: paragraphs(
      'SQLite is a single file, needs no daemon and is fast enough for a surprising amount of traffic.',
      'Start there, measure, and move to a server only when the numbers tell you to.',
    ),
    tags: ['sqlite', 'nodejs'],
    favoritedBy: ['alice', 'erin'],
  },
  {
    author: 'alice',
    title: 'Writing your first end-to-end test',
    description: 'From an empty file to a reliable test in one sitting',
    body: paragraphs(
      'Pick one user journey that matters, such as signing in and publishing an article.',
      'Drive it through the UI, wait for real signals (a response, a visible element) instead of fixed sleeps, and assert on what the user sees.',
    ),
    tags: ['testing', 'automation', 'playwright'],
    favoritedBy: ['carol', 'dave', 'erin'],
    comments: [
      { author: 'carol', body: 'The bit about waiting for real signals instead of sleeping saved me hours.' },
      { author: 'dave', body: 'Do you run these against a seeded database?' },
    ],
  },
  {
    author: 'carol',
    title: 'Accessible forms in Angular',
    description: 'Labels, errors and focus management that work for everyone',
    body: paragraphs(
      'Every input needs a programmatic label, and every error message needs to be announced.',
      'Move focus to the first invalid field on submit so keyboard and screen reader users are not left guessing.',
    ),
    tags: ['angular', 'accessibility'],
    favoritedBy: ['alice', 'erin'],
  },
  {
    author: 'alice',
    title: 'Flaky tests: a field guide',
    description: 'How to find, fix and prevent tests that fail at random',
    body: paragraphs(
      'Most flaky tests share a handful of causes: timing, shared state, test order and the clock.',
      'Quarantine them quickly, fix the root cause, and never just add a retry and move on.',
    ),
    tags: ['testing', 'automation', 'ci'],
    favoritedBy: ['bob', 'carol', 'dave', 'erin'],
    comments: [
      { author: 'bob', body: 'Our worst offender was a test that depended on the clock.' },
      { author: 'erin', body: 'Bookmarking this for our next retro.' },
    ],
  },
  {
    author: 'dave',
    title: 'Notes from my first week on the team',
    description: 'What surprised me, and what I would tell the next new joiner',
    body: paragraphs(
      'The codebase was smaller than I expected and the test suite was bigger.',
      'Pairing on a real bug on day two taught me more than any onboarding document.',
    ),
    tags: [],
    favoritedBy: [],
  },
  {
    author: 'bob',
    title: 'Designing a REST API that frontends enjoy',
    description: 'Consistent shapes, useful errors and predictable pagination',
    body: paragraphs(
      'Return the same envelope everywhere, make errors machine-readable, and document how pagination works.',
      'Your frontend colleagues will thank you, and so will whoever writes the tests.',
    ),
    tags: ['nodejs'],
    favoritedBy: ['carol', 'erin'],
  },
  {
    author: 'alice',
    title: 'Test data that tells a story',
    description: 'Seed data your whole team can reason about',
    body: paragraphs(
      'Random data hides bugs and makes failures hard to reproduce.',
      'Give your seed users personas and your articles predictable dates, and every test report becomes easier to read.',
    ),
    tags: ['testing', 'automation'],
    favoritedBy: ['dave'],
  },
  {
    author: 'carol',
    title: 'Signals in Angular, explained with a shopping cart',
    description: 'A practical introduction to fine-grained reactivity',
    body: paragraphs(
      'A cart total is the classic computed value: it depends on items and quantities and should update on its own.',
      'Signals make that dependency explicit and keep change detection cheap.',
    ),
    tags: ['angular', 'performance'],
    favoritedBy: ['alice', 'bob', 'erin'],
  },
  {
    author: 'alice',
    title: 'Choosing what not to automate',
    description: 'Automation is a cost as well as a benefit',
    body: paragraphs(
      'Some checks are cheaper to do by hand: one-off migrations, visual polish, features that will change next week.',
      'Automate what is stable, valuable and repetitive, and be honest about the rest.',
    ),
    tags: ['automation', 'career'],
    favoritedBy: [],
  },
  {
    author: 'bob',
    title: 'Indexes, explained without the jargon',
    description: 'Why some queries are instant and others crawl',
    body: paragraphs(
      'An index is a sorted copy of some columns that lets the database skip most of the table.',
      'Add them for the columns you filter and sort on, and check the query plan before and after.',
    ),
    tags: ['sqlite', 'performance'],
    favoritedBy: ['alice', 'dave', 'erin'],
  },
  {
    author: 'alice',
    title: 'Page objects or not?',
    description: 'Structuring UI tests so they survive redesigns',
    body: paragraphs(
      'Page objects help when many tests share the same screens. They hurt when they grow into a second application.',
      'Start with small helpers named after user intent, and extract page objects only when duplication appears.',
    ),
    tags: ['testing', 'playwright'],
    favoritedBy: ['bob'],
  },
  {
    author: 'carol',
    title: 'Keyboard navigation checklist',
    description: 'Ten checks you can run in five minutes',
    body: paragraphs(
      'Can you reach every control with Tab? Is the focus always visible? Does Escape close dialogs?',
      'Run through the list on every new screen before it ships.',
    ),
    tags: ['accessibility', 'angular'],
    favoritedBy: [],
    comments: [{ author: 'dave', body: 'The tab order on our settings page fails the first check. Fixing it today.' }],
  },
  {
    author: 'alice',
    title: 'Markdown cheat sheet for Conduit authors',
    description: 'Everything the editor understands, in one article',
    body: [
      '## Headings',
      'Start a line with `##` for a section heading and `###` for a sub-heading.',
      '## Lists',
      '- Unordered items start with a dash\n- like this one',
      '1. Ordered items start with a number\n2. and keep counting',
      '## Code',
      'Inline code uses single backticks, such as `npm run dev`. Blocks use three:',
      '```ts\nconst greeting = `Hello, Conduit`;\nconsole.log(greeting);\n```',
      '## Quotes and links',
      '> Quality is never an accident.',
      'Read the rest of the articles on the [home page](/).',
    ].join('\n\n'),
    tags: [],
    favoritedBy: ['erin'],
  },
  {
    author: 'bob',
    title: 'Migrating a Node service to ESM',
    description: 'A step-by-step plan that keeps the service deployable',
    body: paragraphs(
      'Convert leaf modules first, keep the build green after every step, and switch the package type last.',
      'Most of the pain is in tooling configuration, not in your own code.',
    ),
    tags: ['nodejs'],
    favoritedBy: ['carol'],
  },
  {
    author: 'alice',
    title: 'Running tests in CI without tears',
    description: 'Fast feedback, clear failures, no surprises',
    body: paragraphs(
      'Keep the pipeline under ten minutes, upload artefacts when something fails, and make reruns cheap.',
      'A red build should tell you what broke without anyone opening a log file.',
    ),
    tags: ['ci', 'testing', 'automation'],
    favoritedBy: ['bob', 'carol'],
  },
  {
    author: 'dave',
    title: 'What I learned from breaking production',
    description: 'A short, honest post-mortem',
    body: paragraphs(
      'A configuration change that looked harmless took the API down for twenty minutes.',
      'The fix was quick. The lessons were about review, rollback and making the safe path the easy one.',
    ),
    tags: ['career', 'ci'],
    favoritedBy: ['alice', 'bob', 'carol'],
    comments: [
      { author: 'alice', body: 'Thanks for writing this up so openly.' },
      { author: 'carol', body: 'The rollback section is gold.' },
    ],
  },
  {
    author: 'alice',
    title: 'Reviewing test code',
    description: 'What to look for when the change is mostly tests',
    body: paragraphs(
      'Ask what would make each test fail, whether the name says what it checks, and whether it would still pass if the feature broke.',
      'Tests are code that guards code, so they deserve the same care.',
    ),
    tags: ['testing'],
    favoritedBy: ['dave'],
  },
  {
    author: 'carol',
    title: 'Angular performance quick wins',
    description: 'Small changes with a big effect on load time',
    body: paragraphs(
      'Lazy-load routes, defer below-the-fold components and keep an eye on your bundle budget.',
      'Measure before and after, because guesses about performance are usually wrong.',
    ),
    tags: ['angular', 'performance'],
    favoritedBy: ['bob'],
  },
  {
    author: 'bob',
    title: 'Backups for SQLite, the boring way',
    description: 'Copying the file is not enough while it is in use',
    body: paragraphs(
      'Use the online backup API or VACUUM INTO to get a consistent copy of a live database.',
      'Then test the restore, because a backup you have never restored is only a hope.',
    ),
    tags: ['sqlite', 'security'],
    favoritedBy: [],
  },
  {
    author: 'alice',
    title: 'How a five-person team cut its regression testing from two days to two hours without hiring anyone',
    description: 'A long title, and a long story made short',
    body: paragraphs(
      'We listed every manual check, deleted the ones nobody could justify, and automated the stable core.',
      'The remaining manual checks became a short exploratory session at the end of each sprint.',
    ),
    tags: ['automation', 'testing'],
    favoritedBy: ['carol', 'erin'],
  },
  {
    author: 'bob',
    title: 'Rate limiting in Node without Redis',
    description: 'A token bucket that fits in one file',
    body: paragraphs(
      'For a single instance, an in-memory token bucket per client is simple and fast.',
      'Persist the buckets in SQLite if you need them to survive restarts.',
    ),
    tags: ['nodejs', 'sqlite'],
    favoritedBy: ['alice'],
  },
  {
    author: 'alice',
    title: 'Exploratory testing sessions that actually find bugs',
    description: 'Charters, time boxes and good notes',
    body: paragraphs(
      'Give each session a charter, such as "explore article editing with slow network", and a fixed time box.',
      'Write down what you tried as well as what you found. The notes are half the value.',
    ),
    tags: ['testing', 'playwright'],
    favoritedBy: ['bob', 'dave', 'erin'],
    comments: [
      { author: 'bob', body: 'We tried this last sprint and found three bugs in the editor.' },
      { author: 'carol', body: 'Do you share the session notes with developers?' },
      { author: 'dave', body: 'The charter examples are really helpful.' },
      { author: 'erin', body: 'Can a new joiner run one of these on day one?' },
      { author: 'bob', body: 'Following up: two of those editor bugs are fixed now.' },
    ],
  },
  {
    author: 'alice',
    title: 'Release notes for testers',
    description: 'What we need to know before a release, in one page',
    body: paragraphs(
      'List what changed, what was not tested, and which areas carry the most risk.',
      'A good release note turns a vague worry into a focused test plan.',
    ),
    tags: ['testing', 'ci'],
    favoritedBy: [],
    comments: [{ author: 'carol', body: 'Could you share the template?' }],
  },
];

const shortHash = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 8);

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: process.env.DATABASE_URL ?? 'file:./dev.db' }),
});

async function main() {
  if ((await prisma.user.count()) > 0) {
    console.error('The database already has data. Run `npm run db:reset` from the repo root for a clean, seeded database.');
    process.exitCode = 1;
    return;
  }

  for (const user of users) {
    await prisma.user.create({
      data: {
        username: user.username,
        email: `${user.username}@example.com`,
        password: await bcrypt.hash(PASSWORD, SALT_ROUNDS),
        bio: user.bio,
        image: user.image,
      },
    });
  }

  // Same direction as POST /api/profiles/:username/follow: the followed user's `followedBy` gains the follower.
  for (const [follower, followed] of Object.entries(follows)) {
    for (const username of followed) {
      await prisma.user.update({
        where: { username },
        data: { followedBy: { connect: { username: follower } } },
      });
    }
  }

  let comments = 0;
  for (const [index, article] of articles.entries()) {
    const createdAt = new Date(FIRST_ARTICLE_AT + index * DAY);
    const { id } = await prisma.article.create({
      data: {
        // Same shape as the API's slugs: slugify(title) plus an 8-character suffix (here derived from the title).
        slug: `${slugify(article.title)}-${shortHash(article.title)}`,
        title: article.title,
        description: article.description,
        body: article.body,
        createdAt,
        updatedAt: createdAt,
        author: { connect: { username: article.author } },
        tagList: { connectOrCreate: article.tags.map(name => ({ where: { name }, create: { name } })) },
        favoritedBy: { connect: article.favoritedBy.map(username => ({ username })) },
      },
    });

    for (const [k, comment] of (article.comments ?? []).entries()) {
      const at = new Date(createdAt.getTime() + (k + 1) * HOUR);
      await prisma.comment.create({
        data: {
          body: comment.body,
          createdAt: at,
          updatedAt: at,
          article: { connect: { id } },
          author: { connect: { username: comment.author } },
        },
      });
      comments++;
    }
  }

  const favourites = articles.reduce((sum, article) => sum + article.favoritedBy.length, 0);
  const followCount = Object.values(follows).reduce((sum, list) => sum + list.length, 0);
  console.log(
    `Seeded ${users.length} users, ${articles.length} articles, ${await prisma.tag.count()} tags, ` +
      `${comments} comments, ${favourites} favourites and ${followCount} follows. Password for every user: ${PASSWORD}`,
  );
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    // Exit explicitly: on Windows, libsql's native finalizers can crash the process with an access
    // violation during normal Node teardown, after all work is done (tursodatabase/libsql-js#231).
    // process.exit() skips those finalizers. Measured on Windows 11: 4 crashes in 60 runs without it, 0 in 100 with it.
    process.exit(process.exitCode ?? 0);
  });
