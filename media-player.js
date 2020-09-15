/* global screenfull */
import '@brightspace-ui/core/components/icons/icon.js';
import '@d2l/seek-bar/d2l-seek-bar.js';
import './node_modules/screenfull/dist/screenfull.js';
import { css, html, LitElement } from 'lit-element/lit-element.js';
import { InternalLocalizeMixin } from './src/mixins/internal-localize-mixin';
import { RtlMixin } from '@brightspace-ui/core/mixins/rtl-mixin';
import { styleMap } from 'lit-html/directives/style-map';

const nativeControls = !document.createElement('video').canPlayType;
const HIDE_DELAY_MS = 2000;
const KEY_BINDINGS = {
	play: ' ',
	mute: 'm',
	fullscreen: 'f'
};
const SEEK_BAR_UPDATE_PERIOD_MS = 250;
const TIMEOUT_FOR_DOUBLE_CLICK_MS = 500;

class MediaPlayer extends InternalLocalizeMixin(RtlMixin(LitElement)) {

	static get properties() {
		return {
			src: { type: String },
			_muted: { type: Boolean, attribute: false },
			_playing: { type: Boolean, attribute: false },
			_recentlyShowedCustomControls: { type: Boolean, attribute: false },
			_secondsDuration: { type: Number, attribute: false },
			_secondsElapsed: { type: Number, attribute: false },
			_speed: { type: Number, attribute: false },
			_usingSpeedContainer: { type: Boolean, attribute: false },
			_usingVolumeContainer: { type: Boolean, attribute: false },
			_volume: { type: Number, attribute: false },
		};
	}

	static get styles() {
		return css`
			:host {
				display: block;
			}

			:host([hidden]) {
				display: none;
			}

			#d2l-labs-media-player-video-container {
				background-color: black;
				position: relative;
			}

			#d2l-labs-media-player-video {
				display: block;
				height: 100%;
				max-height: 100vh;
				width: 100%;
			}

			#d2l-labs-media-player-video-controls {
				background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7));
				bottom: 0px;
				position: absolute;
				transition: all 0.2s ease;
				width: 100%;
			}

			#d2l-labs-media-player-video-controls > * {
				position: relative;
				top: 0px;
			}

			#d2l-labs-media-player-seek-bar {
				--d2l-knob-focus-color: #fff;
				--d2l-knob-focus-size: 4px;
				--d2l-knob-size: 15px;
				--d2l-outer-knob-color: var(--d2l-color-celestine-plus-1);
				--d2l-progress-border-radius: 0;
				position: absolute;
				top: -9px;
				width: 100%;
			}

			#d2l-labs-media-player-buttons {
				align-items: center;
				direction: ltr;
				display: flex;
				flex-direction: row;
				justify-content: space-between;
			}

			#d2l-labs-media-player-flex-filler {
				flex: auto;
			}

			.d2l-labs-media-player-control-element {
				margin: 0 2px;
				padding: 0;
				height: 43px;
				position: relative;
				width: 42px;
			}

			.d2l-labs-media-player-control-element:hover {
				background: rgba(255, 255, 255, 0.2);
				cursor: pointer;
			}

			#d2l-labs-media-player-time {
				margin: 0 12px;
			}

			#d2l-labs-media-player-time:hover {
				cursor: auto;
			}

			.d2l-labs-media-player-control-display {
				color: white;
			}

			.d2l-labs-media-player-button {
				border-radius: 4px;
				background-color: transparent;
				border: 3px solid transparent;
				outline: none;
				width: 100%;
				height: 100%;
			}

			.d2l-labs-media-player-button:focus {
				border: 3px solid white;
			}

			.d2l-labs-media-player-button:hover {
				cursor: pointer;
			}

			#d2l-labs-media-player-volume-container {
				padding: 0;
			}

			#d2l-labs-media-player-volume-level-container {
				bottom: 42px;
				height: 10px;
				left: 0;
				position: absolute;
				width: 42px;
			}

			#d2l-labs-media-player-volume-level-background {
				background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7));
				border-radius: 0px 5px 5px 0px;
				bottom: 76px;
				height: 42px;
				left: -39px;
				padding: 0px 10px;
				position: relative;
				width: 100px;
			}

			#d2l-labs-media-player-volume-level {
				--d2l-knob-focus-color: #fff;
				--d2l-knob-focus-size: 4px;
				--d2l-knob-size: 18px;
				--d2l-outer-knob-color: var(--d2l-color-celestine-plus-1);
				position: relative;
				top: 12px;
			}

			#d2l-labs-media-player-volume-button {
				font-size: 1rem;
				height: 43px;
				position: relative;
				width: 42px;
				z-index: 1;
			}

			#d2l-labs-media-player-speed-button {
				font-size: 1rem;
				position: relative;
				z-index: 1;
			}

			#d2l-labs-media-player-speed-level-container {
				bottom: 32px;
				height: 16px;
				position: absolute;
				right: -25px;
				width: 100px;
			}

			#d2l-labs-media-player-speed-level-background {
				background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7));
				border-radius: 5px 5px 0px 0px;
				bottom: 16px;
				display: flex;
				flex-direction: column;
				height: 275px;
				position: absolute;
				width: 110px;
			}

			#d2l-labs-media-player-speed-level-background > button {
				border-bottom: 1px solid rgba(255, 255, 255, 0.2);
				color: white;
				font-size: 0.8rem;
				padding: 0;
				width: 100%;
			}

			#d2l-labs-media-player-speed-level-background > button:hover {
				background: rgba(255, 255, 255, 0.3);
			}

			.d2l-labs-media-player-rotated {
				transform: rotate(-90deg);
			}
		`;
	}

	static _formatTime(totalSeconds) {
		totalSeconds = Math.floor(totalSeconds);

		let str = '';

		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const hours = Math.floor(totalSeconds / 3600);

		if (hours > 0) {
			str += `${hours}:`;

			if (minutes < 10) {
				str += '0';
			}
		}

		str += `${minutes}:`;

		const seconds = totalSeconds % 60;
		if (seconds < 10) {
			str += '0';
		}

		str += seconds;

		return str;
	}

	constructor() {
		super();

		this._hoveringVideoControls = false;
		this._muted = false;
		this._playing = false;
		this._recentlyShowedCustomControls = false;
		this._secondsDuration = 1;
		this._secondsElapsed = 0;
		this._speed = 1;
		this._usingSpeedContainer = false;
		this._usingVolumeContainer = false;
		this._videoClicked = false;
		this._volume = 1;

		this._listenForKeyboard = this._listenForKeyboard.bind(this);
	}

	render() {
		const fullscreenIcon = screenfull.isFullscreen ? 'tier1:smallscreen' : 'tier1:fullscreen';
		const playIcon = this._playing ? 'tier1:pause' : 'tier1:play';
		const volumeIcon = this._muted ? 'tier1:volume-muted' : 'tier1:volume';

		const fullscreenTooltip = `${screenfull.isFullscreen ? this.localize('exitFullscreen') : this.localize('fullscreen')} (${KEY_BINDINGS.fullscreen})`;
		const playTooltip = `${this._playing ? this.localize('pause') : this.localize('play')} (${this.localize('spacebar')})`;
		const volumeTooltip = `${this._muted ? this.localize('unmute') : this.localize('mute')} (${KEY_BINDINGS.mute})`;

		const videoContainerStyle = { cursor: nativeControls || !this._hidingCustomControls() ? 'auto' : 'none' };

		return html`
		<div id="d2l-labs-media-player-video-container" style=${styleMap(videoContainerStyle)} ?hidden="${this.src === undefined}" @mousemove=${this._onVideoContainerMouseMove}>
			<video ?controls="${nativeControls}" id="d2l-labs-media-player-video" preload="metadata" @play=${this._onPlay} @pause=${this._onPause} @loadedmetadata=${this._onLoadedMetadata} @loadeddata=${this._onLoadedData} @click=${this._onVideoClick} @volumechange=${this._onVolumeChange}>
				<source src="${this.src}">
			</video>

			<div id="d2l-labs-media-player-video-controls" ?hidden="${this._hidingCustomControls()}" @mouseenter=${this._startHoveringControls} @mouseleave=${this._stopHoveringControls}>
				<d2l-seek-bar fullWidth solid id="d2l-labs-media-player-seek-bar" value="${Math.floor(this._secondsElapsed / this._secondsDuration * 100)}" aria-label="SeekBar" aria-valuenow="${Math.floor(this._secondsElapsed / this._secondsDuration * 100)}" @drag-end=${this._onDragEndSeek} @position-change=${this._onPositionChangeSeek}></d2l-seek-bar>
				<div id="d2l-labs-media-player-buttons">
					<div class="d2l-labs-media-player-control-element">
						<button class="d2l-labs-media-player-button" id="d2l-labs-media-player-play-button" title="${playTooltip}" @click=${this._togglePlay}>
							<d2l-icon class="d2l-labs-media-player-control-display" icon="${playIcon}"></d2l-icon>
						</button>
					</div>

					<div class="d2l-labs-media-player-control-element" id="d2l-labs-media-player-volume-container" @mouseenter=${this._startUsingVolumeContainer} @mouseleave=${this._stopUsingVolumeContainer}>
						<button class="d2l-labs-media-player-button" id="d2l-labs-media-player-volume-button" title="${volumeTooltip}" @click=${this._toggleMute} @focus=${this._startUsingVolumeContainer} @focusout=${this._stopUsingVolumeContainer}>
							<d2l-icon class="d2l-labs-media-player-control-display" icon="${volumeIcon}"></d2l-icon>
						</button>

						<div id="d2l-labs-media-player-volume-level-container" ?hidden="${!this._usingVolumeContainer}">
							<div class="d2l-labs-media-player-rotated" id="d2l-labs-media-player-volume-level-background">
								<d2l-seek-bar solid id="d2l-labs-media-player-volume-level" vertical="" value="${Math.round(this._volume * 100)}" @drag-end=${this._onDragEndVolume} @position-change=${this._onPositionChangeVolume} @focus=${this._startUsingVolumeContainer} @focusout=${this._stopUsingVolumeContainer}></d2l-seek-bar>
							</div>
						</div>
					</div>

					<div class="d2l-labs-media-player-control-display" id="d2l-labs-media-player-time">
						${MediaPlayer._formatTime(this._secondsElapsed)} / ${MediaPlayer._formatTime(this._secondsDuration)}
					</div>

					<div id="d2l-labs-media-player-flex-filler"></div>

					<div class="d2l-labs-media-player-control-element" @mouseenter=${this._startUsingSpeedContainer} @mouseleave=${this._stopUsingSpeedContainer}>
						<button class="d2l-labs-media-player-control-display d2l-labs-media-player-button" id="d2l-labs-media-player-speed-button" @focus=${this._startUsingSpeedContainer} @focusout=${this._stopUsingSpeedContainer}>
							${this._speed}
						</button>

						<div id="d2l-labs-media-player-speed-level-container" ?hidden="${!this._usingSpeedContainer}">
							<div id="d2l-labs-media-player-speed-level-background">
								<button class="d2l-labs-media-player-button" value="0.25" @click=${this._updatePlaybackRate} @focus=${this._startUsingSpeedContainer} @focusout=${this._stopUsingSpeedContainer}>0.25</button>
								<button class="d2l-labs-media-player-button" value="0.5" @click=${this._updatePlaybackRate} @focus=${this._startUsingSpeedContainer} @focusout=${this._stopUsingSpeedContainer}>0.5</button>
								<button class="d2l-labs-media-player-button" value="0.75" @click=${this._updatePlaybackRate} @focus=${this._startUsingSpeedContainer} @focusout=${this._stopUsingSpeedContainer}>0.75</button>
								<button class="d2l-labs-media-player-button" value="1" @click=${this._updatePlaybackRate} @focus=${this._startUsingSpeedContainer} @focusout=${this._stopUsingSpeedContainer}>${this.localize('normal')}</button>
								<button class="d2l-labs-media-player-button" value="1.25" @click=${this._updatePlaybackRate} @focus=${this._startUsingSpeedContainer} @focusout=${this._stopUsingSpeedContainer}>1.25</button>
								<button class="d2l-labs-media-player-button" value="1.5" @click=${this._updatePlaybackRate} @focus=${this._startUsingSpeedContainer} @focusout=${this._stopUsingSpeedContainer}>1.5</button>
								<button class="d2l-labs-media-player-button" value="2" @click=${this._updatePlaybackRate} @focus=${this._startUsingSpeedContainer} @focusout=${this._stopUsingSpeedContainer}>2</button>
							</div>
						</div>
					</div>

					<div class="d2l-labs-media-player-control-element">
						<button ?hidden="${!this._fullscreenEnabled()}" class="d2l-labs-media-player-button" title="${fullscreenTooltip}" @click=${this._toggleFullscreen}>
							<d2l-icon class="d2l-labs-media-player-control-display" icon="${fullscreenIcon}"></d2l-icon>
						</button>
					</div>
				</div>
			</div>
		</div>
		`;
	}

	firstUpdated() {
		super.firstUpdated();

		this._seekBar = this.shadowRoot.getElementById('d2l-labs-media-player-seek-bar');
		this._speedLevelBackground = this.shadowRoot.getElementById('d2l-labs-media-player-speed-level-background');
		this._speedLevelButtons = this.shadowRoot.querySelectorAll('#d2l-labs-media-player-speed-level-background button');
		this._video = this.shadowRoot.getElementById('d2l-labs-media-player-video');
		this._videoContainer = this.shadowRoot.getElementById('d2l-labs-media-player-video-container');
		this._volumeLevel = this.shadowRoot.getElementById('d2l-labs-media-player-volume-level');

		this._updateTimeElapsed();

		this._videoContainer.addEventListener('keydown', this._listenForKeyboard);
		this._videoContainer.addEventListener('click', () => this._videoContainer.focus());

		const resizeObserver = new ResizeObserver((entries) => {
			entries.forEach(() => {
				const backgroundHeightPx = this.offsetHeight - 60;
				this._speedLevelBackground.style.maxHeight = `${backgroundHeightPx}px`;
				this._speedLevelButtons.forEach((button) => {
					button.style.maxHeight = `${Math.floor(backgroundHeightPx / 7)}px`;
				});
			});
		});

		resizeObserver.observe(this);
	}

	_onVideoContainerMouseMove() {
		this._showControls(true);
	}

	_onDragEndSeek() {
		// _onDragEndSeek() is called once before firstUpdated()
		if (this._seekBar) {
			this._updateCurrentTimeOfVideo(this._seekBar.immediateValue / 100);
		}
	}

	_onPositionChangeSeek() {
		this._updateCurrentTimeOfVideo(this._seekBar.immediateValue / 100);
		this._showControls(true);
	}

	_updateCurrentTimeOfVideo(fraction) {
		this._video.currentTime = Math.floor(fraction * this._secondsDuration);
	}

	_onDragEndVolume() {
		// _onDragEndVolume() is called once before firstUpdated()
		if (this._volumeLevel) {
			this._video.volume = this._volumeLevel.immediateValue / 100;
		}
	}

	_onPositionChangeVolume() {
		this._video.volume = this._volumeLevel.immediateValue / 100;
	}

	_onVolumeChange() {
		this._volume = this._video.volume;

		if (this._volume > 0) {
			this._muted = false;
		}
	}

	_onPlay() {
		this._playing = true;
	}

	_onPause() {
		this._playing = false;
	}

	_onVideoClick() {
		this._togglePlay();
		this._showControls(true);

		if (this._videoClicked) {
			this._toggleFullscreen();
		} else {
			setTimeout(() => {
				if (this._videoClicked) {
					this._videoClicked = false;
				}
			}, TIMEOUT_FOR_DOUBLE_CLICK_MS);
		}

		this._videoClicked = !this._videoClicked;
	}

	_togglePlay() {
		if (this._video.paused) {
			this._video.play();
		} else {
			this._video.pause();
		}
	}

	_toggleMute() {
		if (this._muted) {
			this._video.volume = this.preMuteVolume;
		} else {
			this.preMuteVolume = this._video.volume;
			this._video.volume = 0;
		}

		this._muted = !this._muted;
	}

	_toggleFullscreen() {
		if (!this._fullscreenEnabled()) return;

		if (screenfull.isFullscreen) {
			screenfull.exit();
		} else {
			screenfull.request(this._videoContainer);
		}
	}

	_fullscreenEnabled() {
		return screenfull.isEnabled;
	}

	_onLoadedMetadata() {
		this._secondsDuration = Math.floor(this._video.duration);
	}

	_onLoadedData() {
		this.dispatchEvent(new CustomEvent('d2l-labs-media-player-video-load'));
	}

	_updateTimeElapsed() {
		this._secondsElapsed = this._video.currentTime;

		setTimeout(() => this._updateTimeElapsed(), SEEK_BAR_UPDATE_PERIOD_MS);
	}

	_listenForKeyboard(e) {
		this._showControls(true);
		switch (e.key) {
			case KEY_BINDINGS.play:
				if (!this.shadowRoot.activeElement || this.shadowRoot.activeElement.id !== 'd2l-labs-media-player-play-button') {
					// Pressing spacebar fires a 'click' event on the focused element. If
					// the play button is focused, hitting spacebar would toggle play twice, doing
					// nothing
					this._togglePlay();
				}

				break;
			case KEY_BINDINGS.mute:
				this._toggleMute();
				break;
			case KEY_BINDINGS.fullscreen:
				this._toggleFullscreen();
				break;
		}
	}

	_startHoveringControls() {
		this._hoveringVideoControls = true;
		this._showControls(false);
	}

	_stopHoveringControls() {
		this._hoveringVideoControls = false;
		this._showControls(true);
	}

	_showControls(temporarily) {
		this._recentlyShowedCustomControls = true;
		clearTimeout(this._showControlsTimeout);

		if (temporarily) {
			this._showControlsTimeout = setTimeout(() => {
				this._recentlyShowedCustomControls = false;
			}, HIDE_DELAY_MS);
		}
	}

	_updatePlaybackRate(e) {
		const rate = e.target.value;
		this._speed = rate;
		this._video.playbackRate = rate;
		this._stopUsingSpeedContainer();
	}

	_startUsingSpeedContainer() {
		setTimeout(() => {
			this._usingSpeedContainer = true;
		}, 0);
	}

	_stopUsingSpeedContainer() {
		setTimeout(() => {
			this._usingSpeedContainer = false;
		}, 0);
	}

	_startUsingVolumeContainer() {
		setTimeout(() => {
			this._usingVolumeContainer = true;
		}, 0);
	}

	_stopUsingVolumeContainer() {
		setTimeout(() => {
			this._usingVolumeContainer = false;
		}, 0);
	}

	_hidingCustomControls() {
		return nativeControls || (this._playing && !this._recentlyShowedCustomControls);
	}
}

customElements.define('d2l-labs-media-player', MediaPlayer);
