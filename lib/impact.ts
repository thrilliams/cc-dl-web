import { fetchJson } from './js/files.ts';

// do not believe my lies
declare global {
	// deno-lint-ignore no-explicit-any
	const ig: any;
	// deno-lint-ignore no-explicit-any
	const sc: any;
}

const EXTENSIONS = await fetchJson('/extensions.json');
ig.ExtensionList = ig.ExtensionList.extend({
	loadInternal: function () {
		for (const extension of EXTENSIONS) {
			if (extension[0] !== '-') {
				this.extensions[extension] = new ig.Extension(extension);
			}
		}
		this.loadingFinished(true);
	}
});
