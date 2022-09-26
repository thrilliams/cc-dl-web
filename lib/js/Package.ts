import { valid, validRange } from 'https://deno.land/std@0.156.0/semver/mod.ts';
import { z } from 'https://deno.land/x/zod@v3.19.1/index.ts';
import { fetchJson } from './files.ts';

export const Package = z.strictObject({
	name: z.string(),
	ccmodHumanName: z.string().optional(),
	version: z.string().refine((ver) => valid(ver) !== null, {
		message: 'Version must be a valid SemVer'
	}),
	ccmodDependencies: z
		.record(
			z.string(),
			z.string().refine((ver) => validRange(ver) !== null, {
				message: 'Version must be a valid SemVer range'
			})
		)
		.default({}),

	module: z.boolean().optional(),
	hidden: z.boolean().optional(),

	description: z.string().optional(),
	homepage: z.string().optional(),

	assets: z.string().array().optional(),
	runtimeAssets: z.record(z.string(), z.string()).optional(),

	// scripts
	main: z.string().optional(),
	preload: z.string().optional(),
	postload: z.string().optional(),
	prestart: z.string().optional(),
	plugin: z.string().optional()
});

export type Package = z.infer<typeof Package>;

export async function loadModPackage(modId: string) {
	const json = await fetchJson(`/mods/${modId}/package.json`);
	const mod = await Package.parseAsync(json);
	return mod;
}
