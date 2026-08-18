/**
 * Builds the static preview and publishes it to the `gh-pages` branch.
 *
 *   npm run pages
 *
 * GitHub Pages serves that branch; there is no Actions workflow because
 * pushing one needs a token with `workflow` scope, and this needs none.
 * `gh auth refresh -s workflow` if you would rather have it rebuild on push.
 *
 * Pages runs no server, so this is a reduced build — see the `STATIC_EXPORT`
 * block in next.config.ts for what it costs. The routes a static host cannot
 * run are deleted before the build and restored from git afterwards, so the
 * application source carries no branches for a host it does not target.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(app, '..');
// `npx` is a .cmd on Windows and needs a shell; `git` is an .exe and must not
// have one, because a shell re-splits arguments and this repository's path
// contains a space.
const shellFor = (cmd) => process.platform === 'win32' && cmd !== 'git';

const run = (cmd, args, cwd = app, env) =>
  execFileSync(cmd, args, {
    cwd,
    stdio: 'inherit',
    shell: shellFor(cmd),
    env: env ? { ...process.env, ...env } : process.env,
  });
const capture = (cmd, args, cwd = repo) =>
  execFileSync(cmd, args, { cwd, encoding: 'utf8', shell: shellFor(cmd) }).trim();

// The build below deletes tracked files and restores them with `git checkout`,
// which would take uncommitted edits with them. Refuse rather than risk it.
if (capture('git', ['status', '--porcelain', '--', 'kaoming-web'])) {
  console.error('');
  console.error('kaoming-web has uncommitted changes.');
  console.error('This publishes from git and restores the working tree with `git checkout`,');
  console.error('which would discard them. Commit or stash first.');
  console.error('');
  process.exit(1);
}

/**
 * Must match `basePath` in next.config.ts, and is checked against it rather
 * than trusted: the two drifting apart would publish a site whose every image
 * and font 404s, which is exactly the failure that is invisible until someone
 * opens the link.
 */
const BASE_PATH = '/kaoming-website';
if (!readFileSync(join(app, 'next.config.ts'), 'utf8').includes(`'${BASE_PATH}'`)) {
  console.error(`next.config.ts no longer sets basePath to ${BASE_PATH}.`);
  process.exit(1);
}

/** Nothing here may run without a server. */
const SERVER_ONLY = ['app/api', 'app/m', 'app/[locale]/[...slug]', 'middleware.ts'];

console.log('\nBuilding the static preview…\n');

for (const path of SERVER_ONLY) rmSync(join(app, path), { recursive: true, force: true });

try {
  run('npx', ['next', 'build'], app, {
    STATIC_EXPORT: '1',
    NEXT_PUBLIC_STATIC_EXPORT: '1',
    // Appendix 2: the redesign is not approved and must not be crawlable
    // under KAO MING's name. `robots.txt` serves Disallow: / because of this.
    NEXT_PUBLIC_ALLOW_INDEXING: 'false',
  });
} finally {
  // Restore from git rather than from a copy: whatever happened above, the
  // working tree ends up exactly as committed.
  run('git', ['checkout', '--', 'kaoming-web'], repo);
}

const out = join(app, 'out');
if (!existsSync(out)) throw new Error('next build produced no out/ directory');

/**
 * `basePath` prefixes routes and `_next/` assets. It does not touch anything
 * referenced out of `/public` — those stay absolute (`/img/...`), which is
 * correct everywhere the site is served from a domain root and wrong on a
 * Pages project site served from `/kaoming-website/`. Fonts make a source-side
 * fix awkward on top of that: the `@font-face` URLs live in CSS, where no
 * helper can reach them.
 *
 * So the prefix is applied to the emitted artifact rather than to the source.
 * The application keeps one truth about where its assets are, and the host
 * that disagrees pays for it here. Matching is anchored to a delimiter plus a
 * real top-level directory of `/public`, so a route like `/en/catalogue/...`
 * cannot be caught by it.
 */
const PUBLIC_DIRS = readdirSync(join(app, 'public'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const REWRITABLE = new Set(['.html', '.css', '.js', '.json', '.txt', '.xml', '.svg']);
// Any of these before the path means it is the whole reference and not the
// tail of a longer URL.
const DELIM = String.raw`["'(=,\s]`;
const ABSOLUTE_PUBLIC = new RegExp(`(${DELIM})/(${PUBLIC_DIRS.join('|')})/`, 'g');

let rewritten = 0;
const prefixAssets = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      prefixAssets(full);
      continue;
    }
    const dot = entry.name.lastIndexOf('.');
    if (dot < 0 || !REWRITABLE.has(entry.name.slice(dot))) continue;
    const before = readFileSync(full, 'utf8');
    const after = before.replace(ABSOLUTE_PUBLIC, '$1' + BASE_PATH + '/$2/');
    if (after !== before) {
      writeFileSync(full, after);
      rewritten += 1;
    }
  }
};
prefixAssets(out);
console.log('Prefixed /public asset paths in ' + rewritten + ' files (' + PUBLIC_DIRS.join(', ') + ').');

// Pages runs the output through Jekyll otherwise, which strips every directory
// beginning with an underscore — including `_next`.
writeFileSync(join(out, '.nojekyll'), '');

// There is no `/` route: the site starts at a locale, and next-intl's
// middleware normally handles that. It does not exist in an export.
writeFileSync(
  join(out, 'index.html'),
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>KAO MING Machinery Industrial Co., Ltd.</title>
    <meta http-equiv="refresh" content="0; url=./en/" />
    <meta name="robots" content="noindex" />
    <style>
      html { background: #0c0b0a; color: #f3f1ec; font-family: system-ui, sans-serif; }
      body { display: grid; place-items: center; min-height: 100vh; margin: 0; }
      a { color: #8fc7ee; }
    </style>
  </head>
  <body>
    <p>Opening <a href="./en/">the site</a>…</p>
    <script>location.replace('./en/');</script>
  </body>
</html>
`,
);

// --- publish
const work = join(repo, '.gh-pages-worktree');
rmSync(work, { recursive: true, force: true });

const branches = capture('git', ['branch', '--list', 'gh-pages']);
if (!branches) {
  run('git', ['worktree', 'add', '--detach', work], repo);
  run('git', ['checkout', '--orphan', 'gh-pages'], work);
  run('git', ['rm', '-rf', '--quiet', '.'], work);
} else {
  run('git', ['worktree', 'add', work, 'gh-pages'], repo);
  // Everything on this branch is generated; clear it so removals propagate.
  try {
    run('git', ['rm', '-rf', '--quiet', '.'], work);
  } catch {
    /* already empty */
  }
}

mkdirSync(work, { recursive: true });
cpSync(out, work, { recursive: true });

run('git', ['add', '-A'], work);
try {
  run('git', ['-c', 'core.safecrlf=false', 'commit', '-q', '-m', 'Static preview'], work);
  run('git', ['push', '-q', '--force', 'origin', 'gh-pages'], work);
  console.log('\nPublished to the gh-pages branch.\n');
} catch {
  console.log('\nNothing changed since the last publish.\n');
}

run('git', ['worktree', 'remove', '--force', work], repo);
