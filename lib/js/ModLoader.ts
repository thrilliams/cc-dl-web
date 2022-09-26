// implements https://github.com/CCDirectLink/CCLoader
// (some code mildly plagiarized)

import { satisfies } from 'https://deno.land/std@0.156.0/semver/mod.ts';
import { fetchJson } from './files.ts';
import { Package, loadModPackage } from './Package.ts';
import { Mod } from './Mod.ts';
import { Loader } from './Loader.ts';
import { UI } from './UI.ts';
import { Plugin } from './Plugin.ts';
import { Greenworks } from './Greenworks.ts';

declare global {
	interface Window {
		inactiveMods: Mod[];
		activeMods: Mod[];
	}
}

const KNOWN_EXTENSIONS = [
	'post-game',
	'manlea',
	'ninja-skin',
	'fish-gear',
	'flying-hedgehag',
	'scorpion-robo',
	'snowman-tank'
];

const CCLOADER_VERSION = '2.22.1';

export class ModLoader {
	loader: Loader = new Loader();
	ui: UI = new UI();

	crosscodeVersion!: string;
	modIds: string[] = [];
	packages: Map<string, Package> = new Map();

	mods: Mod[] = [];

	loadEvent?: Event;

	async start() {
		await this.buildCrosscodeVersion();

		await this.loader.initialize();

		await this.loadModPackages();
		this.orderMods();
		this.constructMods();
		this.registerMods();

		this.setupGameWindow();

		await this.loadPlugins();
		await this.executePreload();

		this.loader.setStatus('Loading Game');
		await this.loader.startGame();

		await this.executePostload();
		await this.loader.waitForPostload();

		window.focus();

		await this.executeMain();

		this.fireLoadEvent();
		this.loader.removeOverlay();
		window.focus();
	}

	async buildCrosscodeVersion() {
		try {
			const { changelog } = await fetchJson('/data/changelog.json');
			this.crosscodeVersion = changelog[0].version;
		} catch (e) {
			const ccVersion = localStorage.getItem('cc.version');
			if (ccVersion) {
				const json = JSON.parse(ccVersion);
				this.crosscodeVersion = json.major + '.' + json.minor + '.' + json.patch;
			} else {
				console.error('Could not find crosscode version. Assuming "0.0.0".', e);
				this.crosscodeVersion = '0.0.0';
			}
		}
	}

	async loadModPackages() {
		// TODO: support them
		console.warn('Mods using .ccmod files are not supported yet.');

		// add ccloader and crosscode
		this.packages.set('crosscode', {
			name: 'CrossCode',
			version: this.crosscodeVersion,
			ccmodDependencies: {}
		});
		this.packages.set('ccloader', {
			name: 'CCLoader-Web',
			version: CCLOADER_VERSION,
			ccmodDependencies: {}
		});

		// add extensions
		const extensions = await fetchJson('/extensions.json');
		await Promise.all(
			extensions.map(async (extension: string) => {
				if (KNOWN_EXTENSIONS.includes(extension)) {
					const json = await fetchJson(`/extension/${extension}/${extension}.json`);
					this.packages.set(extension, {
						name: json.name.en_US,
						version: this.crosscodeVersion,
						ccmodDependencies: {}
					});
				}
			})
		);

		// add real mods
		const modIds = await fetchJson('/mods.json');
		await Promise.all(
			modIds.map(async (modId: string) => {
				const mod = await loadModPackage(modId);
				this.packages.set(modId, mod);
				this.modIds.push(modId);
			})
		);

		// check dependencies
		for (const [modId, mod] of this.packages.entries()) {
			for (const dep in mod.ccmodDependencies) {
				if (!this.packages.has(dep))
					throw new Error(`Mod ${modId} requires ${dep}, but no version is present.`);
				if (!satisfies(this.packages.get(dep)!.version, mod.ccmodDependencies[dep]))
					throw new Error(
						`Mod ${modId} requires ${dep}, but version ${
							this.packages.get(dep)!.version
						} is not valid.`
					);
			}
		}
	}

	canLoad(modId: string, orderedMods: string[]) {
		const mod = this.packages.get(modId)!;
		for (const dependency in mod.ccmodDependencies) {
			if (this.modIds.includes(dependency) && !orderedMods.includes(dependency)) return false;
		}
		return true;
	}

	orderMods() {
		const mods: string[] = [];
		if (this.modIds.includes('simplify')) mods.push('simplify');

		let loops = 0;
		while (mods.length < this.modIds.length) {
			for (const mod of this.modIds) {
				if (!mods.includes(mod) && this.canLoad(mod, mods)) mods.push(mod);
			}

			loops++;
			if (loops > 1000)
				throw new Error('Possible circular dependency. Please check your mods.');
		}

		this.modIds = mods;
	}

	constructMods() {
		for (const modId of this.modIds) {
			this.mods.push(new Mod(modId, this.packages.get(modId)!));
		}
	}

	registerMods() {
		const inactiveMods = window.inactiveMods ? [...window.inactiveMods] : [];
		const activeMods = window.activeMods ? [...window.activeMods] : [];

		for (const mod of this.mods) {
			if (mod.isEnabled) {
				activeMods.push(mod);
			} else {
				inactiveMods.push(mod);
			}
		}

		Object.assign(window, {
			activeMods,
			inactiveMods
		});
	}

	setupGameWindow() {
		this.ui.applyBindings(globalThis.console);

		const versions: { [k: string]: string } = {};
		for (const [id, item] of this.packages.entries()) {
			versions[id] = item.version;
		}

		const process = {
			once: () => {}
		};

		Object.assign(window, {
			Plugin,
			versions,
			Greenworks,
			process
		});

		this.loadEvent = new Event('modsLoaded', {
			bubbles: true,
			cancelable: true
		});
	}

	async loadPlugins() {
		for (const mod of this.mods.filter((m) => m.isEnabled && m.package.plugin)) {
			try {
				await mod.loadPlugin();
			} catch (e) {
				console.error(`Could not load plugin of mod '${mod.package.name}': `, e);
			}
		}
	}

	async executePreload() {
		for (const mod of this.mods.filter((m) => m.isEnabled)) {
			try {
				await mod.loadPreload();
			} catch (e) {
				console.error(`Could not run preload of mod '${mod.package.name}': `, e);
			}
		}
	}

	async executePostload() {
		for (const mod of this.mods.filter((m) => m.isEnabled)) {
			try {
				await mod.loadPostload();
			} catch (e) {
				console.error(`Could not run postload of mod '${mod.package.name}': `, e);
			}
		}
	}

	async executeMain() {
		for (const mod of this.mods.filter((m) => m.isEnabled)) {
			try {
				await mod.load();
			} catch (e) {
				console.error(`Could not run mod '${mod.package.name}': `, e);
			}
		}
	}

	fireLoadEvent() {
		window.document.body.dispatchEvent(this.loadEvent!);
	}
}

const loader = new ModLoader();
await loader.start();
