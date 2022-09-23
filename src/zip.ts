import {
	TextReader,
	TextWriter,
	ZipReader,
	ZipWriter,
	fs,
	getMimeType,
	ZipDirectoryEntry
} from 'https://deno.land/x/zipjs@v2.6.29/index.js';
import { readableStreamFromReader } from 'https://deno.land/std@0.156.0/streams/mod.ts';
import { join, SEP_PATTERN } from 'https://deno.land/std@0.156.0/path/mod.ts';

export async function addFileToZip<T = unknown>(
	writer: ZipWriter<T>,
	path: string,
	zipPath = path
) {
	const reader = await Deno.open(path, { read: true });
	const readableStream = readableStreamFromReader(reader);
	await writer.add(zipPath, readableStream);
}

async function addDirectoryContentsToZip(path: string, zip: ZipDirectoryEntry) {
	for await (const entry of Deno.readDir(path)) {
		if (entry.isFile) {
			const data = await Deno.readFile(join(path, entry.name));
			const blob = new Blob([data], { type: getMimeType(entry.name) });
			zip.addBlob(entry.name, blob);
		} else {
			const dir = zip.addDirectory(entry.name);
			await addDirectoryContentsToZip(join(path, entry.name), dir);
		}
	}
}

export async function createZipFromDirectory(path: string, basepath?: string) {
	const zip = new fs.FS();
	let folder: ZipDirectoryEntry = zip;
	if (basepath && basepath.length > 0) {
		for (const part of basepath.split(SEP_PATTERN)) folder = folder.addDirectory(part);
	}
	await addDirectoryContentsToZip(path, folder);
	return zip.exportBlob();
}

export async function addStringToZip<T = unknown>(
	writer: ZipWriter<T>,
	string: string,
	zipPath: string
) {
	const reader = new TextReader(string);
	await writer.add(zipPath, reader);
}

export async function getTextFromZip<T = unknown>(reader: ZipReader<T>, zipPath: string) {
	const writer = new TextWriter();
	for await (const entry of reader.getEntriesGenerator()) {
		if (entry.filename === zipPath) return entry.getData!(writer);
	}
}
