import { fetchText } from './files.ts';

const startScript = `async function start() {
	const response = await fetch('/extensions.json');
	const extensions = await response.json();
	ig.ExtensionList = ig.ExtensionList.extend({
		loadInternal: function () {
			for (const extension of extensions) {
				if (extension[0] !== '-') {
					this.extensions[extension] = new ig.Extension(extension);
				}
			}
			this.loadingFinished(true);
		}
	});

	$('.playOptions').fadeIn(200);
	startCrossCode();
}

window.addEventListener('load', start);`;

declare global {
	interface Window {
		// deno-lint-ignore no-explicit-any
		ig: any;
		// deno-lint-ignore no-explicit-any
		sc: any;
	}
}

export class Loader {
	doc: Document | null = null;
	readyCalled = false;
	postloadPoint?: HTMLElement;
	overlay?: HTMLElement;
	status?: HTMLElement;
	currentBody?: Node;

	async initialize() {
		await this.readyEntrypoint();
		this.insertOverlay();
		this.postloadPoint = this.findGame();
	}

	async loadEntrypoint() {
		try {
			return await fetchText('/node-webkit.html');
		} catch (_e) {
			throw new Error('Could not find CrossCode entrypoint.');
		}
	}

	async readyEntrypoint() {
		const code = await this.loadEntrypoint();
		const doc = new DOMParser().parseFromString(code, 'text/html');
		const script: HTMLScriptElement = doc.querySelector('body > script')!;
		script.innerHTML = startScript;
		this.doc = doc;
	}

	insertOverlay() {
		/*
		<link rel="stylesheet" href="index.css">
		<div id="overlay"></div>
		<h1 id="status" class="title">Initializing CCLoader</h1>
		<div id="ui" class="ui"></div>
		*/

		const style = this.doc!.createElement('link');
		style.rel = 'stylesheet';
		style.href = '/index.css';
		this.doc!.head.appendChild(style);

		const overlayDiv = this.doc!.createElement('div');
		overlayDiv.id = 'overlay';
		this.doc!.body.appendChild(overlayDiv);
		this.overlay = overlayDiv;

		const status = this.doc!.createElement('h1');
		status.id = 'status';
		status.className = 'title';
		status.innerText = 'Initializing CCLoader';
		this.doc!.body.appendChild(status);
		this.status = status;

		const uiDiv = this.doc!.createElement('div');
		uiDiv.id = 'ui';
		uiDiv.className = 'ui';
		this.doc!.body.appendChild(uiDiv);
	}

	removeOverlay() {
		document.getElementById('overlay')!.style.visibility = 'hidden';
		document.getElementById('status')!.style.visibility = 'hidden';
	}

	findGame() {
		return this.doc!.getElementById('game')!;
	}

	setStatus(text: string) {
		this.status!.innerText = text;
	}

	copyUI() {
		const target = this.doc!.getElementById('ui')!;
		const source = document.getElementById('ui')!;
		target.innerHTML = source.innerHTML;
	}

	createScript(src: string) {
		const result = this.doc!.createElement('script');
		result.src = 'data:text/javascript,' + src;
		result.type = 'text/javascript';
		return result;
	}

	insertAfter(newNode: HTMLElement, referenceNode: HTMLElement) {
		referenceNode.parentNode!.insertBefore(newNode, referenceNode.nextSibling);
	}

	hookDOM() {
		this.currentBody = undefined;
		Object.defineProperty(document, 'body', {
			get: () => {
				return this.currentBody;
			},
			set: (value) => {
				this.currentBody = value;
			}
		});
	}

	startGame() {
		return new Promise((resolve) => {
			Object.assign(window, {
				postload: resolve
			});

			const hook = this.createScript('window.postload()');
			this.insertAfter(hook, this.postloadPoint!);
			this.hookDOM();

			this.copyUI();

			document.open();
			document.write('<!DOCTYPE html>', this.doc!.documentElement.outerHTML);
			document.close();
		});
	}

	waitForPostload() {
		this.currentBody = document.lastChild!.lastChild!; //Actual body; bypasses document.body hook
		if (window.ig['_DOMReady']) {
			window.ig['_DOMReady']();
		}

		return new Promise((resolve) => {
			const intervalid = setInterval(() => {
				if (window.ig && window.ig.ready) {
					clearInterval(intervalid);
					resolve(null);
				}
			}, 300);
		});
	}
}
