import { DenonConfig } from 'https://deno.land/x/denon@2.5.0/mod.ts';

const config: DenonConfig = {
	scripts: {
		start: {
			cmd: 'deno run -A src/index.ts -M'
		}
	},
	watcher: {
		exts: ['js', 'jsx', 'ts', 'tsx', 'json', 'html'],
		skip: ['out/**/*']
	}
};

export default config;
