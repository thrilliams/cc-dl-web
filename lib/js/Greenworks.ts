// deno-lint-ignore-file no-unused-vars

// Does nothing in browser, but causes issues if missing
export class Greenworks {
	constructor(version: string) {}

	init() {
		return;
	}

	initAPI() {
		return;
	}

	clearAchievement(steamId: string, callback = () => {}) {
		console.warn('Steam-related APIs are not available when running CrossCode in the browser.');
		callback();
	}

	activateAchievement(steamId: string, callback = () => {}) {
		console.warn('Steam-related APIs are not available when running CrossCode in the browser.');
		callback();
	}
}
