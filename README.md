# Installation

0. Get [Deno](https://deno.land/), if you don't have it already
1. `git clone https://github.com/thrilliams/cc-dl-web`
2. Put some of your choicest mods in `/mods`
3. Use

# Usage

`deno run --allow-write --allow-read --allow-run src/index.ts [...options] [output path]`

Options:

-   `--assets [path]` or `-A [path]` - If you are on Mac with a default CrossCode install, this _should_ be unnecessary. Otherwise, you can use this to specify where your CrossCode `assets` folder is.
-   `--production` or `-P` - Causes the program to copy files into the output directory rather than creating symlinks.
-   `--vanilla` or `-V` - Builds the game without including CCLoader.
-   `--mods [path]` or `-M [path]` - Changes the default mods folder from `./mods`.
-   By passing a path after other options, you can specify a directory other than `./out` for the program to build the game to.
