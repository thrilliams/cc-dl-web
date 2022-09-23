import { ensureDir } from 'https://deno.land/std@0.156.0/fs/mod.ts';
import { join, relative } from 'https://deno.land/std@0.156.0/path/mod.ts';
import { TextWriter, Uint8ArrayWriter, ZipEntry } from 'https://deno.land/x/zipjs@v2.6.29/index.js';
import { reader } from '../temp/zipBundle.ts';

async function recursiveCopyFromBundle(entry: ZipEntry, dest: string, rootEntry: ZipEntry) {
	const path = join(dest, relative(rootEntry.getFullname(), entry.getFullname()));
	if (entry.children.length > 0) {
		await ensureDir(path);
		for (const child of entry.children) {
			recursiveCopyFromBundle(child, dest, rootEntry);
		}
	} else {
		const writer = new Uint8ArrayWriter();
		const data = await entry.data?.getData!(writer);
		await Deno.writeFile(path, data!);
		return;
	}
}

export async function copyFromBundle(src: string, dest: string) {
	const entry = reader.find(src);
	if (!entry) throw Error(`Entry not found: ${src}`);

	await recursiveCopyFromBundle(entry, dest, entry);
}

export async function readTextFromBundle(path: string) {
	const entry = reader.find(path);
	if (!entry) throw Error(`File not found: ${path}`);

	if (entry.data?.directory) throw Error(`Zip entry at ${path} is a directory!`);

	const writer = new TextWriter();
	const data = await entry.data?.getData!(writer);
	return data;
}
