import { join } from 'https://deno.land/std@0.156.0/path/mod.ts';

export async function fetchText(url: string) {
	const request = await fetch(url);
	const text = await request.text();
	return text;
}

export async function fetchJson(url: string) {
	const request = await fetch(url);
	const json = await request.json();
	return json;
}

export function loadScript(url: string, doc: Document, type: string): Promise<null> {
	if (!type) type = 'text/javascript';

	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.onload = () => resolve(null);
		script.onerror = () => reject();
		script.type = type;
		script.src = url;
		doc.head.appendChild(script);
	});
}

export function loadMod(id: string, url: string, module: boolean): Promise<null> {
	return loadScript(join('mods', id, url), document, module ? 'module' : 'text/javascript');
}

export function loadImage(path: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const result = new Image();
		result.onload = () => resolve(result);
		result.onerror = (err) => reject(err);
		result.src = path;
	});
}
