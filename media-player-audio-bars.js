import { css, html, LitElement } from 'lit-element/lit-element.js';
import { styleMap } from 'lit-html/directives/style-map';

const AUDIO_BARS_GRADIENT_COLOURS = {
	start: 'DAE4EB',
	middle: 'A7D5F6',
	end: '8EB5D1'
};
const UPDATE_PERIOD_MS = 50;

class MediaPlayerAudioBars extends LitElement {
	static get properties() {
		return {
			_audioBars: { type: Array, attribute: false },
			playing: { type: Boolean }
		};
	}

	static get styles() {
		return css`
			#d2l-labs-media-player-audio-bars-row {
				display: flex;
				flex-direction: row;
				height: 100%;
			}

			#d2l-labs-media-player-audio-bar-container {
				display: flex;
				flex-direction: column;
				height: 100%;
			}

			.d2l-labs-media-player-audio-bar {
				margin: 0 0.1rem;
				width: 0.25rem;
			}
		`;
	}

	constructor() {
		super();

		const numAudioBars = 50;
		this._audioBars = [];
		for (let i = 0; i < numAudioBars; i++) {
			this._audioBars.push({
				blue: 0,
				green: 0,
				red: 0,
				height: Math.round(Math.random() * 70 + 30)
			});
		}

		this._startChangingAudioBars();
	}

	render() {
		return html`
			<div id="d2l-labs-media-player-audio-bars-row">
				${this._audioBars.map(audioBar => html`
					<div id="d2l-labs-media-player-audio-bar-container">
						<div style="flex: auto;"></div>
						<div class="d2l-labs-media-player-audio-bar" style=${styleMap({ backgroundColor: `rgba(${audioBar.red}, ${audioBar.green}, ${audioBar.blue}, 1)`, height: `${audioBar.height}%` })}></div>
					</div>
				`)}
			</div>
		`;
	}

	_startChangingAudioBars() {
		this._audioBarsOffset = 0;

		this._changeColoursOfAudioBars();

		setInterval(() => {
			if (!this.playing) return;

			this._changeColoursOfAudioBars();
		}, UPDATE_PERIOD_MS);
	}

	_changeColoursOfAudioBars() {
		const newAudioBars = [];

		this._audioBars.forEach((audioBar, i) => {
			let newAudioBar = {};

			Object.keys(audioBar).forEach(key => newAudioBar[key] = audioBar[key]);

			newAudioBar = {
				...newAudioBar,
				...this._getRgbOfAudioBar(i)
			};

			newAudioBars.push(newAudioBar);
		});

		this._audioBars = newAudioBars;

		if (this._audioBarsOffset === this._audioBars.length - 1) this._audioBarsOffset = 0;
		else this._audioBarsOffset += 1;
	}

	_getRgbOfAudioBar(i) {
		const iPosition = (i + this._audioBarsOffset) % this._audioBars.length;
		const fraction = iPosition / this._audioBars.length;

		let fromColour;
		let toColour;
		let innerFraction;

		if (fraction < 0.25) {
			fromColour = AUDIO_BARS_GRADIENT_COLOURS.start;
			toColour = AUDIO_BARS_GRADIENT_COLOURS.middle;
			innerFraction = fraction * 4;
		} else if (fraction < 0.5) {
			fromColour = AUDIO_BARS_GRADIENT_COLOURS.middle;
			toColour = AUDIO_BARS_GRADIENT_COLOURS.end;
			innerFraction = (fraction - 0.25) * 4;
		} else if (fraction < 0.75) {
			fromColour = AUDIO_BARS_GRADIENT_COLOURS.end;
			toColour = AUDIO_BARS_GRADIENT_COLOURS.middle;
			innerFraction = (fraction - 0.5) * 4;
		} else {
			fromColour = AUDIO_BARS_GRADIENT_COLOURS.middle;
			toColour = AUDIO_BARS_GRADIENT_COLOURS.start;
			innerFraction = (fraction - 0.75) * 4;
		}

		const fromRed = parseInt(fromColour.substr(0, 2), 16);
		const toRed = parseInt(toColour.substr(0, 2), 16);

		const fromGreen = parseInt(fromColour.substr(2, 4), 16);
		const toGreen = parseInt(toColour.substr(2, 4), 16);

		const fromBlue = parseInt(fromColour.substr(4, 6), 16);
		const toBlue = parseInt(toColour.substr(4, 6), 16);

		return {
			red: Math.round(fromRed + (toRed - fromRed) * innerFraction),
			green: Math.round(fromGreen + (toGreen - fromGreen) * innerFraction),
			blue: Math.round(fromBlue + (toBlue - fromBlue) * innerFraction)
		};
	}
}

customElements.define('d2l-labs-media-player-audio-bars', MediaPlayerAudioBars);
