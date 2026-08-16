/**
 * Puts the running site on a temporary public URL, for showing someone.
 *
 *   npm run start     (in one terminal)
 *   npm run share     (in another)
 *
 * A Cloudflare quick tunnel — no account, no signup, no deployment. The site is
 * served by *this* machine, so everything works exactly as it does locally: the
 * 3D scenes, the catalogue reader, and the enquiry form writing a real lead to
 * the real database.
 *
 * Three things to know before sending the link on:
 *
 *  * **It lives as long as this process does.** Close the terminal and the URL
 *    stops resolving. That is the feature, not a limitation — nothing is
 *    published and nothing outlives the conversation.
 *  * **The address changes every time.** Quick tunnels are assigned at random,
 *    so send the current one rather than saving it anywhere.
 *  * **Anyone with the link can open it.** It is unguessable rather than
 *    protected. `robots.txt` serves `Disallow: /` while indexing is off, so it
 *    stays out of search engines, but treat the URL itself as the key.
 *
 * For something that outlives the terminal, deploy it — see DEPLOYMENT.md.
 */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

let binary;
try {
  ({ bin: binary } = require('cloudflared'));
} catch {
  console.error('\ncloudflared is not installed.  npm i -D cloudflared\n');
  process.exit(1);
}

const PORT = process.env.PORT ?? '3000';

// Fail early and clearly rather than opening a tunnel to nothing.
try {
  const response = await fetch(`http://localhost:${PORT}/en`, { redirect: 'manual' });
  if (response.status >= 500) throw new Error(String(response.status));
} catch {
  console.error(
    `\nNothing is serving on port ${PORT}.\n\n  Run \`npm run demo\` in another terminal first.\n`,
  );
  process.exit(1);
}

console.log(`\nOpening a tunnel to localhost:${PORT}…\n`);

const tunnel = spawn(binary, ['tunnel', '--url', `http://localhost:${PORT}`], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

let announced = false;

const watch = (chunk) => {
  const text = String(chunk);
  const [url] = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/) ?? [];
  if (!url || announced) return;
  announced = true;

  const line = '─'.repeat(url.length + 4);
  console.log(`  ┌${line}┐`);
  console.log(`  │  ${url}  │`);
  console.log(`  └${line}┘\n`);
  console.log('  Live while this window stays open. Ctrl-C ends it.');
  console.log('  Start them here:');
  console.log(`     ${url}/en`);
  console.log(`     ${url}/en/products/gantry-machining-center/kmc-gm\n`);
};

tunnel.stdout.on('data', watch);
tunnel.stderr.on('data', watch);

const stop = () => {
  tunnel.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
tunnel.on('exit', (code) => process.exit(code ?? 0));
