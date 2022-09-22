import { ensureDir, ensureSymlink, emptyDir, copy } from 'https://deno.land/std@0.156.0/fs/mod.ts';
import { join, resolve } from 'https://deno.land/std@0.156.0/path/mod.ts';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.35-alpha/deno-dom-wasm.ts';
import { parseFlags } from 'https://deno.land/x/cliffy@v0.25.0/flags/mod.ts';

const args = parseFlags(Deno.args);

let ASSETS = args.flags.A || args.flags.assets;
const DEV_DIR = './lib';
const PROD_DIR = './out';
const PRODUCTION = args.flags.P || args.flags.production;

const locateAssets = () => {
	switch (Deno.build.os) {
		case 'darwin':
			return join(
				Deno.env.get('HOME')!,
				'/Library/Application Support/Steam/steamapps/common/CrossCode/CrossCode.app/Contents/Resources/app.nw/assets/'
			);
		// other platforms go here
	}
};

const prepareGameDir = async () => {
	await ensureDir(PRODUCTION ? PROD_DIR : DEV_DIR);
	if (!PRODUCTION) await emptyDir(DEV_DIR);
};

const makeSymlinksOrCopies = async () => {
	for await (const entry of Deno.readDir(ASSETS)) {
		if (entry.name !== 'node-webkit.html') {
			if (!PRODUCTION) {
				await ensureSymlink(join(ASSETS, entry.name), join(DEV_DIR, entry.name));
			} else {
				await copy(join(ASSETS, entry.name), join(PROD_DIR, entry.name));
			}
		}
	}

	if (!PRODUCTION) {
		await ensureSymlink(resolve('./src/favicon'), join(DEV_DIR, 'favicon'));
	} else {
		await copy(resolve('./src/favicon'), join(PROD_DIR, 'favicon'));
	}
};

const patchHtml = async () => {
	const htmlPath = 'src/vanilla.html';
	const html = await Deno.readTextFile(htmlPath);
	const doc = new DOMParser().parseFromString(html, 'text/html')!;

	const script = doc.querySelector('body > script')!;
	const lines = script.innerText.split('\n');
	const index = lines.findIndex((e) => e.includes('const EXTENSIONS'));
	const indentation = lines[index].slice(0, lines[index].indexOf('const EXTENSIONS'));
	const extensions = [];
	for await (const entry of Deno.readDir(join(PRODUCTION ? PROD_DIR : DEV_DIR, 'extension')))
		if (entry.isDirectory) extensions.push(entry.name);
	lines[index] = `${indentation}const EXTENSIONS = [${extensions
		.map((e) => `'${e}'`)
		.join(', ')}];`;
	script.innerText = lines.join('\n');

	await Deno.writeTextFile(
		join(PRODUCTION ? PROD_DIR : DEV_DIR, 'index.html'),
		`<!DOCTYPE html>${doc.documentElement!.innerHTML}`
	);
};

const build = async () => {
	if (!ASSETS) {
		const estimatedPath = locateAssets()!;
		ASSETS = estimatedPath;
	}
	await prepareGameDir();
	await makeSymlinksOrCopies();
	await patchHtml();
};

build();
