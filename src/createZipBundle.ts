import { ensureDir } from 'https://deno.land/std@0.156.0/fs/mod.ts';
import { createZipFromDirectory } from './zip.ts';

const blob = await createZipFromDirectory('lib', 'lib');

const u8arr = new Uint8Array(await blob.arrayBuffer());
const templatedScript = `import { fs } from 'https://deno.land/x/zipjs@v2.6.29/index.js';

const blob = new Blob([new Uint8Array(${JSON.stringify(Array.from(u8arr))})]);

const reader = new fs.FS();
await reader.importBlob(blob);

export { reader };
`;

await ensureDir('temp');
await Deno.writeTextFile('temp/zipBundle.ts', templatedScript);
