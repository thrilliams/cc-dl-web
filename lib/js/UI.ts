import { loadImage } from './files.ts';

interface ButtonSize {
	size: {
		width: number;
		height: number;
	};
	offset: {
		x: number;
		y: number;
	};
}

const BUTTON_SIZES: { [k: string]: ButtonSize } = {
	left: {
		size: {
			width: 9,
			height: 24
		},
		offset: {
			x: 0,
			y: 0
		}
	},
	center: {
		size: {
			width: 13,
			height: 24
		},
		offset: {
			x: 9,
			y: 0
		}
	},
	right: {
		size: {
			width: 9,
			height: 24
		},
		offset: {
			x: 22,
			y: 0
		}
	}
};

interface Button {
	x: number;
	y: number;
}

const BUTTONS: { [k: string]: Button } = {
	blue: {
		x: 0,
		y: 65
	},
	orange: {
		x: 32,
		y: 65
	},
	red: {
		x: 64,
		y: 65
	}
};

const LOADED_BUTTONS: { [k: string]: string } = {};

const SCALING = 2;
const BORDER_SIZE = 7;

const LOG_TYPE = {
	ERROR: 0b001,
	WARNING: 0b010,
	INFO: 0b100
};

export class UI {
	loaded = false;
	nextID = 1;

	constructor() {
		this.loadImage();
	}

	async loadImage() {
		const image = await loadImage('/media/gui/buttons.png');
		this.prepareImage(image);
	}

	get container() {
		return document.getElementById('ui')!;
	}

	prepareImage(img: HTMLImageElement) {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d')!;

		for (const buttonName in BUTTONS) {
			const button = BUTTONS[buttonName];
			for (const part in BUTTON_SIZES) {
				const data = BUTTON_SIZES[part];

				canvas.width = data.size.width;
				canvas.height = data.size.height;

				ctx.clearRect(0, 0, data.size.width, data.size.height);
				ctx.drawImage(
					img,
					button.x + data.offset.x,
					button.y + data.offset.y,
					data.size.width,
					data.size.height,
					0,
					0,
					data.size.width,
					data.size.height
				);

				LOADED_BUTTONS[`${buttonName}.${part}`] = canvas.toDataURL();
			}
		}

		this.loaded = true;
	}

	drawButton(text: string, type: string, timeout: number) {
		const id = 'uimsg_' + this.nextID++;

		const entry = document.createElement('div');
		entry.id = id;
		entry.style.display = 'flex';
		entry.style.height = BUTTON_SIZES.center.size.height * SCALING + 'px';
		entry.style.marginTop = '5px';

		if (this.loaded) {
			entry.style.fontSize =
				((BUTTON_SIZES.center.size.height - BORDER_SIZE) * SCALING) / 2 + 'px';

			const left = document.createElement('div');
			left.style.backgroundImage = `url("${LOADED_BUTTONS[`${type}.left`]}")`;
			left.style.imageRendering = 'pixelated';
			left.style.width = BUTTON_SIZES.left.size.width * SCALING + 'px';
			left.style.height = BUTTON_SIZES.left.size.height * SCALING + 'px';
			left.style.backgroundSize = `${BUTTON_SIZES.left.size.width * SCALING}px ${
				BUTTON_SIZES.left.size.height * SCALING
			}px`;
			entry.appendChild(left);

			const center = document.createElement('div');
			center.style.backgroundImage = `url("${LOADED_BUTTONS[`${type}.center`]}")`;
			center.style.imageRendering = 'pixelated';
			center.style.height = BUTTON_SIZES.center.size.height * SCALING + 'px';
			center.style.backgroundSize = `${BUTTON_SIZES.center.size.width * SCALING}px ${
				BUTTON_SIZES.center.size.height * SCALING
			}px`;

			center.style.lineHeight = BUTTON_SIZES.center.size.height * SCALING + 'px';
			center.innerText = text;

			entry.appendChild(center);

			const right = document.createElement('div');
			right.style.backgroundImage = `url("${LOADED_BUTTONS[`${type}.right`]}")`;
			right.style.imageRendering = 'pixelated';
			right.style.width = BUTTON_SIZES.right.size.width * SCALING + 'px';
			right.style.height = BUTTON_SIZES.right.size.height * SCALING + 'px';
			right.style.backgroundSize = `${BUTTON_SIZES.right.size.width * SCALING}px ${
				BUTTON_SIZES.right.size.height * SCALING
			}px`;
			entry.appendChild(right);
		} else {
			entry.style.lineHeight = BUTTON_SIZES.center.size.height * SCALING + 'px';
			entry.innerText = text;
		}

		this.container.appendChild(entry);

		setTimeout(() => this.container.removeChild(document.getElementById(id)!), timeout * 1000);
	}

	drawMessage(text: string, type: string, timeout: number) {
		const lines = text.split('\n');
		for (const line of lines) {
			this.drawButton(line, type, timeout);
		}
	}

	// deno-lint-ignore no-explicit-any
	log(...msg: any[]) {
		this.drawMessage(msg.join(' '), 'blue', 2);
	}

	// deno-lint-ignore no-explicit-any
	warn(...msg: any[]) {
		this.drawMessage(msg.join(' '), 'orange', 2);
	}

	// deno-lint-ignore no-explicit-any
	error(...msg: any[]) {
		if (msg[0] instanceof Error) msg[0] = msg[0].stack || msg[0];

		this.drawMessage(msg.join(' '), 'red', 15);
	}

	applyBindings(console: Console) {
		const err = console.error;
		const warn = console.warn;
		const log = console.log;

		// deno-lint-ignore no-explicit-any
		const logFlags: any = localStorage.getItem('logFlags') || 3;

		if (logFlags & LOG_TYPE.ERROR)
			console.error = (...msg) => {
				this.error.apply(this, msg);
				err.apply(console, msg);
			};

		if (logFlags & LOG_TYPE.WARNING)
			console.warn = (...msg) => {
				this.warn.apply(this, msg);
				warn.apply(console, msg);
			};

		if (logFlags & LOG_TYPE.INFO)
			console.log = (...msg) => {
				this.log.apply(this, msg);
				log.apply(console, msg);
			};
	}
}
