import {
	ensureDir,
	ensureSymlink,
	emptyDir,
	copy,
	walk
} from 'https://deno.land/std@0.156.0/fs/mod.ts';
import { join, relative, resolve } from 'https://deno.land/std@0.156.0/path/mod.ts';
import { parseFlags } from 'https://deno.land/x/cliffy@v0.25.0/flags/mod.ts';

const args = parseFlags(Deno.args);

let ASSETS = (args.flags.A || args.flags.assets) && resolve(args.flags.A || args.flags.assets);

const PRODUCTION = args.flags.P || args.flags.production;
const OUT_DIR = './out'; //PRODUCTION ? './out' :

const MODDED = args.flags.M || args.flags.modded;
const MOD_PATH = './mods';

function locateAssets() {
	switch (Deno.build.os) {
		case 'darwin':
			return join(
				Deno.env.get('HOME')!,
				'/Library/Application Support/Steam/steamapps/common/CrossCode/CrossCode.app/Contents/Resources/app.nw/assets/'
			);
		// other platforms go here
	}
}

async function prepareGameDir() {
	await ensureDir(OUT_DIR);
	await emptyDir(OUT_DIR);
}

async function makeSymlinksOrCopies() {
	if (PRODUCTION) {
		for await (const entry of Deno.readDir(ASSETS)) {
			if (entry.name !== 'node-webkit.html')
				await copy(join(ASSETS, entry.name), join(OUT_DIR, entry.name));
		}
	} else {
		for await (const entry of walk(ASSETS)) {
			if (entry.name === 'node-webkit.html') continue;
			if (entry.isDirectory) continue;
			await ensureSymlink(entry.path, join(OUT_DIR, relative(ASSETS, entry.path)));
		}
	}

	if (MODDED) {
		await (PRODUCTION ? copy : ensureSymlink)(
			join(ASSETS, 'node-webkit.html'),
			join(OUT_DIR, 'node-webkit.html')
		);

		// copy mod assets since i have no cells in my brain and don't how to do this otherwise
		for await (const mod of Deno.readDir(MOD_PATH)) {
			if (mod.isFile) continue;
			if (mod.name.startsWith('-')) continue;
			const packageJson = await Deno.readTextFile(join(MOD_PATH, mod.name, 'package.json'));
			const modPackage = JSON.parse(packageJson);
			if (!modPackage.assets) continue;
			for (const asset of modPackage.assets) {
				(PRODUCTION ? copy : ensureSymlink)(
					resolve(join(MOD_PATH, mod.name, 'assets', asset)),
					join(OUT_DIR, asset)
				);
			}
		}
	}

	if (PRODUCTION) {
		await copy('lib/favicon/', join(OUT_DIR, 'favicon'));
	} else {
		await ensureSymlink(join(Deno.cwd(), 'lib/favicon/'), join(OUT_DIR, 'favicon'));
	}

	// TODO: remote alternative
	if (MODDED) {
		if (PRODUCTION) {
			await copy(MOD_PATH, join(OUT_DIR, 'mods'));
		} else {
			await ensureSymlink(join(Deno.cwd(), MOD_PATH), join(OUT_DIR, 'mods'));
		}
	}
}

async function bundleCssAndJs() {
	await Deno.run({
		cmd: [
			Deno.execPath(),
			'bundle',
			'-c',
			'src/webcfg.json',
			`lib/${MODDED ? 'modded' : 'vanilla'}.ts`,
			join(OUT_DIR, 'index.js')
		],
		stdout: 'piped'
	}).output();

	if (MODDED) {
		await copy('lib/index.css', join(OUT_DIR, 'index.css'), { overwrite: true });
	}
}

async function patchHtml() {
	const htmlPath = `lib/${MODDED ? 'modded' : 'vanilla'}.html`;
	const html = await Deno.readTextFile(htmlPath);
	await Deno.writeTextFile(join(OUT_DIR, 'index.html'), html);
}

async function writeExtensionsAndMods() {
	const extensions = [];
	for await (const entry of Deno.readDir(join(OUT_DIR, 'extension')))
		if (entry.isDirectory && !entry.name.startsWith('-')) extensions.push(entry.name);
	await Deno.writeTextFile(join(OUT_DIR, 'extensions.json'), JSON.stringify(extensions));

	if (MODDED) {
		const mods = [];
		for await (const entry of Deno.readDir(join(OUT_DIR, 'mods')))
			if (entry.isDirectory && !entry.name.startsWith('-')) mods.push(entry.name);
		await Deno.writeTextFile(join(OUT_DIR, 'mods.json'), JSON.stringify(mods));
	}
}

async function build() {
	if (!ASSETS) {
		const estimatedPath = locateAssets()!;
		ASSETS = estimatedPath;
	}

	await prepareGameDir();
	await makeSymlinksOrCopies();
	await bundleCssAndJs();
	await patchHtml();
	await writeExtensionsAndMods();
}

build();
