// Ensures native optional binaries exist for local Windows builds.
//
// Bun does not install platform-specific optionalDependencies on Windows
// (lightningcss, @tailwindcss/oxide). This postinstall step restores the
// lightningcss binary from the explicit devDependency when missing.
// On other platforms, or when the binary is already present, it is a no-op.

import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

if (process.platform !== 'win32') {
  process.exit(0);
}

const lightningcssTarget = join(
  process.cwd(),
  'node_modules',
  'lightningcss',
  'lightningcss.win32-x64-msvc.node'
);
const lightningcssSource = join(
  process.cwd(),
  'node_modules',
  'lightningcss-win32-x64-msvc',
  'lightningcss.win32-x64-msvc.node'
);

if (!existsSync(lightningcssTarget)) {
  if (existsSync(lightningcssSource)) {
    copyFileSync(lightningcssSource, lightningcssTarget);
    console.log('[windows-native] restored lightningcss win32 binary.');
  } else {
    console.warn(
      '[windows-native] lightningcss win32 binary missing; run `bun install` again.'
    );
  }
}
