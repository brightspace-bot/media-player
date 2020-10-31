import { css, html, LitElement } from 'lit-element/lit-element.js';
import { styleMap } from 'lit-html/directives/style-map';
import ResizeObserver from 'resize-observer-polyfill';

const AUDIO_BARS_GRADIENTS = [
	{
		from: '29A6FF',
		weight: 9
	},
	{
		from: '00D2ED',
		weight: 9
	},
	{
		from: '2DE2C0',
		weight: 2
	},
	{
		start: true,
		from: '29A6FF',
		weight: 76
	}
];
const { AUDIO_BARS_GRADIENTS_OFFSET, AUDIO_BARS_GRADIENTS_DISPLAYED_WEIGHT } = AUDIO_BARS_GRADIENTS.reduce((r, gradient) => {
	if (gradient.start || r.AUDIO_BARS_GRADIENTS_DISPLAYED_WEIGHT > 0) {
		r.AUDIO_BARS_GRADIENTS_DISPLAYED_WEIGHT += gradient.weight;
	} else {
		r.AUDIO_BARS_GRADIENTS_OFFSET += gradient.weight;
	}

	return r;
}, { AUDIO_BARS_GRADIENTS_OFFSET: 0, AUDIO_BARS_GRADIENTS_DISPLAYED_WEIGHT: 0 });

AUDIO_BARS_GRADIENTS.forEach((gradient, i) => {
	gradient.fractionPassedNonInclusive = 0;
	gradient.fractionPassedInclusive = gradient.weight / (AUDIO_BARS_GRADIENTS_OFFSET + AUDIO_BARS_GRADIENTS_DISPLAYED_WEIGHT);

	if (i > 0) {
		gradient.fractionPassedNonInclusive = AUDIO_BARS_GRADIENTS[i - 1].fractionPassedInclusive;
		gradient.fractionPassedInclusive += gradient.fractionPassedNonInclusive;
	}

	if (i < AUDIO_BARS_GRADIENTS.length - 1) {
		gradient.to = AUDIO_BARS_GRADIENTS[i + 1].from;
	} else {
		gradient.to = AUDIO_BARS_GRADIENTS[0].from;
	}
});
const AUDIO_BAR_HEIGHTS = [30, 45, 50, 60, 58, 55, 100, 80, 95, 94, 60, 94, 93, 93, 93, 93, 92, 55, 45, 45, 54, 55, 53, 52, 50, 51, 51, 51, 51, 51, 52, 60, 60, 63, 59, 58, 59, 90, 95, 85, 86, 85, 80, 79, 77, 70, 54, 60, 65, 64, 64, 60, 69, 70, 75, 65, 66, 67, 70, 68, 69, 60, 59, 60, 10, 25, 26, 100, 95, 95, 93, 95, 77, 75, 76, 76, 77, 80, 79, 79, 75, 60, 59, 62, 63, 62, 45, 50, 52, 45, 49, 49, 49, 48, 47, 47];
const AUDIO_BAR_HORIZONTAL_MARGIN_REM = 0.05;
const AUDIO_BAR_WIDTH_REM = 0.25;
const FULL_BYTE = 255;
const GAMMA = 0.43;
const GAMMA_ADJUSTMENT_EXPONENT = 2.4;
const LINEAR_OFFSET = 0.055;
const UNDER_LINEAR_THRESHOLD_FACTOR = 12.92;
const UPDATE_PERIOD_MS = 50;

class MediaPlayerAudioBars extends LitElement {
	static get properties() {
		return {
			playing: { type: Boolean },
			_visibleAudioBars: { type: Array, attribute: false },
		};
	}

	static get styles() {
		return css`
			#d2l-labs-media-player-audio-bars-row {
				align-items: center;
				justify-content: center;
				display: flex;
				flex-direction: row;
				height: 100%;
				width: 100%;
			}

			#d2l-labs-media-player-audio-bar-container {
				display: flex;
				flex-direction: column;
				height: 100%;
			}

			.d2l-labs-media-player-audio-bar {
				border-top-left-radius: 0.075rem;
				border-top-right-radius: 0.075rem;
				margin: 0 ${AUDIO_BAR_HORIZONTAL_MARGIN_REM}rem;
				width: ${AUDIO_BAR_WIDTH_REM}rem;
			}
		`;
	}

	constructor() {
		super();

		this._audioBarColours = [];
		this._changingAudioBarsInterval = null;
		this._gradientAudioBars = [];
		this._numVisibleAudioBars = 0;
		this._visibleAudioBars = [];
	}

	render() {
		return html`
			<div id="d2l-labs-media-player-audio-bars-row">
				${this._visibleAudioBars.map(audioBar => html`
					<div id="d2l-labs-media-player-audio-bar-container">
						<div style="flex: auto;"></div>
						<div class="d2l-labs-media-player-audio-bar" style=${styleMap({ backgroundColor: `rgba(${audioBar.red}, ${audioBar.green}, ${audioBar.blue}, 1)`, height: `${audioBar.height}%` })}></div>
					</div>
				`)}
			</div>
		`;
	}

	firstUpdated(changedProperties) {
		super.firstUpdated(changedProperties);

		let loops = 0;
		new ResizeObserver((entries) => {
			for (const entry of entries) {
				loops++;

				// if (loops > 2) return;
				const { width } = entry.contentRect;

				const fontSize = getComputedStyle(document.documentElement).fontSize;
				const pxPerRem = fontSize.substr(0, fontSize.indexOf('px'));

				const audioBarWidthPx = AUDIO_BAR_WIDTH_REM * pxPerRem;
				const audioBarHorizontalMarginPx = AUDIO_BAR_HORIZONTAL_MARGIN_REM * pxPerRem;
				const numAudioBarsThatCanFit = Math.floor(width / (audioBarWidthPx + 2 * audioBarHorizontalMarginPx));
				this._numVisibleAudioBars = Math.min(numAudioBarsThatCanFit, AUDIO_BAR_HEIGHTS.length);
				const numAudioBarColours = Math.floor(this._numVisibleAudioBars * (1 + (AUDIO_BARS_GRADIENTS_OFFSET / AUDIO_BARS_GRADIENTS_DISPLAYED_WEIGHT)));

				this._audioBarColours = [];
				this._visibleAudioBars = [];
				for (let i = 0; i < this._numVisibleAudioBars; i++) {

					let height;

					if (this._numVisibleAudioBars < AUDIO_BAR_HEIGHTS.length) {
						height = AUDIO_BAR_HEIGHTS[i + Math.floor((AUDIO_BAR_HEIGHTS.length - this._numVisibleAudioBars) / 2)];
					} else {
						height = AUDIO_BAR_HEIGHTS[i];
					}

					this._visibleAudioBars.push({
						height
					});
				}

				for (let i = 0; i < numAudioBarColours; i++) {
					this._audioBarColours.push(0);
				}

				for (let i = 0; i < numAudioBarColours; i++) {
					this._audioBarColours[i] = this._getRgbOfAudioBar(i);
				}

				this._startChangingAudioBars();
			}
		}).observe(this.shadowRoot.getElementById('d2l-labs-media-player-audio-bars-row'));
	}

	_startChangingAudioBars() {
		this._visibleAudioBarsOffset = this._audioBarColours.length - this._visibleAudioBars.length + 1;

		this._changeColoursOfAudioBars();

		setInterval(() => {
			if (!this.playing) return;

			this._changeColoursOfAudioBars();
		}, UPDATE_PERIOD_MS);
	}

	_changeColoursOfAudioBars() {
		const newVisibleAudioBars = [];

		this._visibleAudioBars.forEach((visibleAudioBar, i) => {
			const audioBarI = (i + this._visibleAudioBarsOffset) % this._audioBarColours.length;

			const colour = this._audioBarColours[audioBarI];

			newVisibleAudioBars.push({
				...visibleAudioBar,
				...colour
			});
		});

		this._visibleAudioBars = newVisibleAudioBars;

		this._visibleAudioBarsOffset = this._visibleAudioBarsOffset === 0 ? this._audioBarColours.length - 1 : this._visibleAudioBarsOffset - 1;
	}

	_getRgbOfAudioBar(i) {
		const fraction = i / this._audioBarColours.length;

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

	static _getGradientFromFraction(fraction) {
		for (let i = 0; i < AUDIO_BARS_GRADIENTS.length; i++) {
			if (fraction < AUDIO_BARS_GRADIENTS[i].fractionPassedInclusive) return AUDIO_BARS_GRADIENTS[i];
		}
	}

	/**
	 * Converts a [0..255] SRGB value to a [0..1] linear value.
	 * @param {Number} rgb SRGB representation of the colour.
	 * @returns {Number} Linear value of the colour.
	 */
	static _fromSRGB(rgb) {
		rgb /= FULL_BYTE;

		return rgb <= 0.04045 ? rgb / UNDER_LINEAR_THRESHOLD_FACTOR : Math.pow((rgb + LINEAR_OFFSET) / (1 + LINEAR_OFFSET), GAMMA_ADJUSTMENT_EXPONENT);
	}

	/**
	 * Converts a [0..1] linear value to a [0..255] SRGB value.
	 * @param {Number} rgb Linear representation of the colour.
	 * @returns {Number} SRGB value of the colour.
	 */
	static _toSRGB(rgb) {
		if (rgb <= 0.0031308) {
			rgb *= UNDER_LINEAR_THRESHOLD_FACTOR;
		} else {
			rgb = ((1 + LINEAR_OFFSET) * (Math.pow(rgb, 1 / GAMMA_ADJUSTMENT_EXPONENT))) - LINEAR_OFFSET;
		}

		return (FULL_BYTE + 1) * rgb;
	}

	static _weightedAverage(a, b, weightOfB) {
		return a + (b - a) * weightOfB;
	}
}

customElements.define('d2l-labs-media-player-audio-bars', MediaPlayerAudioBars);
