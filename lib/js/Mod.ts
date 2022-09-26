import { join } from 'https://deno.land/std@0.156.0/path/mod.ts';
import { loadMod } from './files.ts';
import { Package } from './Package.ts';

export class Mod {
	id: string;
	package: Package;
	disabled = false;
	baseDirectory: string;

	// deno-lint-ignore no-explicit-any
	pluginInstance?: any;

	constructor(id: string, p: Package, compat = true) {
		this.id = id;
		this.package = p;
		this.baseDirectory = `/mods/${id}/`;

		// forces mods to behave in a vanilla way
		if (compat) Object.assign(this, p);
	}

	get isEnabled() {
		if (this.disabled) return false;
		return localStorage.getItem('modEnabled-' + this.id.toLowerCase()) !== 'false';
	}

	async loadStage(
		name: 'main' | 'preload' | 'postload' | 'prestart' | 'plugin',
		forceModule = false
	) {
		if (this.pluginInstance && this.pluginInstance[name]) {
			await this.pluginInstance[name]();
		}

		if (!Object.hasOwn(this.package, name)) return;

		return loadMod(this.id, this.package[name]!, this.package.module || forceModule);
	}

	load() {
		return this.loadStage('main');
	}

	loadPrestart() {
		return this.loadStage('prestart');
	}

	loadPostload() {
		return this.loadStage('postload');
	}

	loadPreload() {
		return this.loadStage('preload');
	}

	async loadPlugin() {
		const module = await import(join('/mods', this.id, this.package.plugin!));

		const plugin = module.default;
		if (!plugin || !plugin.prototype) {
			return;
		}

		this.pluginInstance = new plugin(this);
		return this.pluginInstance;
	}

	getAsset(path: string) {
		if (this.package.assets && this.package.assets.includes(path)) return path;
	}
}
