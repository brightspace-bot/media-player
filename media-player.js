import '@brightspace-ui/core/components/icons/icon.js';
import '@d2l/seek-bar/d2l-seek-bar.js';
import * as screenfull from 'screenfull';
import { css, html, LitElement } from 'lit-element/lit-element.js';
import { InternalLocalizeMixin } from './src/mixins/internal-localize-mixin';
import { styleMap } from 'lit-html/directives/style-map';

const nativeControls = !document.createElement('video').canPlayType;

class MediaPlayer extends InternalLocalizeMixin(LitElement) {

	static get properties() {
		return {
			src: { type: String },
			_hidingControls: { type: Boolean },
			_hoveringSpeedContainer: { type: Boolean },
			_hoveringVolumeContainer: { type: Boolean },
			_muted: { type: Boolean },
			_playing: { type: Boolean },
			_secondsDuration: { type: Number },
			_secondsElapsed: { type: Number },
			_speed: { type: Number },
			_videoContainerStyle: { type: Object },
			_volume: { type: Number },
		};
	}

	static get styles() {
		return css`
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
				display: flex;
				flex-direction: row;
				justify-content: space-between;
			}

			#d2l-labs-media-player-flex-filler {
				flex: auto;
			}

			.d2l-labs-media-player-control-element {
				border-radius: 4px;
				font-size: 1rem;
				margin: 0 2px;
				padding: 10px 10px;
			}

			.d2l-labs-media-player-control-element:hover {
				background: rgba(255, 255, 255, 0.2);
				cursor: pointer;
			}

			#d2l-labs-media-player-time:hover {
				background: rgba(255, 255, 255, 0);
				cursor: auto;
			}

			.d2l-labs-media-player-control-display {
				color: white;
			}

			.d2l-labs-media-player-button {
				background-color: transparent;
				border: none;
				outline: none;
			}

			.d2l-labs-media-player-button:hover {
				cursor: pointer;
			}

			#d2l-labs-media-player-volume-container {
				padding: 0;
			}

			#d2l-labs-media-player-volume-level-container {
				bottom: 35px;
				left: 27px;
				position: absolute;
				width: 75px;
			}

			#d2l-labs-media-player-volume-level-background {
				background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7));
				border-radius: 0px 5px 5px 0px;
				height: 38px;
				left: 36px;
				padding: 0px 10px;
				position: relative;
				top: 2px;
				width: 125px;
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
				position: relative;
				z-index: 1;
			}

			#d2l-labs-media-player-speed-level-container {
				bottom: 32px;
				height: 20px;
				position: absolute;
				width: 50px;
			}

			#d2l-labs-media-player-speed-level-background {
				background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7));
				border-radius: 5px 5px 0px 0px;
				bottom: 20px;
				display: flex;
				flex-direction: column;
				height: 230px;
				left: -33px;
				position: absolute;
				width: 110px;
			}

			#d2l-labs-media-player-speed-level-background > button {
				border-bottom: 1px solid rgba(255, 255, 255, 0.2);
				color: white;
				font-size: 0.8rem;
				padding: 7px 30px;
				width: 100%;
			}

			#d2l-labs-media-player-speed-level-background > button:hover {
				background: rgba(255, 255, 255, 0.3);
			}

			.d2l-labs-media-player-rotated {
				transform: rotate(-90deg);
			}

			@media only screen and (max-device-width: 520px) {
				#d2l-labs-media-player-speed-level-background {
					background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7));
					border-radius: 5px 5px 0px 0px;
					bottom: 20px;
					height: 140px;
					left: -17px;
					position: absolute;
					width: 80px;
				}

				#d2l-labs-media-player-speed-level-background > button {
					border-bottom: 1px solid rgba(255, 255, 255, 0.2);
					color: white;
					font-size: 0.55rem;
					padding: 3px 15px;
					width: 100%;
				}
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

	static get _hideDelay() {
		return 2000;
	}

	static get _keyBindings() {
		return {
			play: ' ',
			mute: 'm',
			fullscreen: 'f'
		};
	}

	static get _seekBarUpdatePeriodMs() {
		return 250;
	}

	static get _timeoutForDoubleClickMs() {
		return 500;
	}

	constructor() {
		super();

		this._hidingControls = true;
		this._hoveringSpeedContainer = false;
		this._hoveringVideoControls = false;
		this._hoveringVolumeContainer = false;
		this._muted = false;
		this._playing = false;
		this._secondsDuration = 1;
		this._secondsElapsed = 0;
		this._speed = 1;
		this._videoClicked = false;
		this._videoContainerStyle = { cursor: 'auto' };
		this._volume = 1;

		this._listenForKeyboard = this._listenForKeyboard.bind(this);
	}

	render() {
		return html`
		<div id="d2l-labs-media-player-video-container" style=${styleMap(this._videoContainerStyle)} ?hidden="${this.src === undefined}" @mousemove=${this._showControlsTemporarily}>
			<video ?controls="${nativeControls}" id="d2l-labs-media-player-video" preload="metadata" @play=${this._onPlay} @pause=${this._onPause} @loadedmetadata=${this._onLoadedMetadata} @loadeddata=${this._onLoadedData} @click=${this._onVideoClick} @volumechange=${this._onVolumeChange}>
				<source src="${this.src}">
			</video>

			<div id="d2l-labs-media-player-video-controls" ?hidden="${nativeControls || (this._hidingControls)}" @mouseenter=${this._startHoveringControls} @mouseleave=${this._stopHoveringControls}>
				<d2l-seek-bar fullWidth solid id="d2l-labs-media-player-seek-bar" value="${Math.floor(this._secondsElapsed / this._secondsDuration * 100)}" aria-label="SeekBar" aria-valuenow="${Math.floor(this._secondsElapsed / this._secondsDuration * 100)}" @drag-end=${this._onDragEndSeek} @position-change=${this._onPositionChangeSeek}></d2l-seek-bar>
				<div id="d2l-labs-media-player-buttons">
					<button class="d2l-labs-media-player-control-element d2l-labs-media-player-button" id="d2l-labs-media-player-play-button" title="${this._getPlayTooltip()}" @click=${this._togglePlay}>
						<d2l-icon class="d2l-labs-media-player-control-display" icon="${this._getPlayIcon()}"></d2l-icon>
					</button>

					<div class="d2l-labs-media-player-control-element" id="d2l-labs-media-player-volume-container" @mouseenter=${this._startHoveringVolumeContainer} @mouseleave=${this._stopHoveringVolumeContainer}>
						<button class="d2l-labs-media-player-button" id="d2l-labs-media-player-volume-button" title="${this._getMuteTooltip()}" @click=${this._toggleMute}>
							<d2l-icon class="d2l-labs-media-player-control-display" icon="tier1:volume"></d2l-icon>
						</button>

						<div class="d2l-labs-media-player-rotated" id="d2l-labs-media-player-volume-level-container" ?hidden="${!this._hoveringVolumeContainer}">
							<div id="d2l-labs-media-player-volume-level-background">
								<d2l-seek-bar solid id="d2l-labs-media-player-volume-level" vertical="" value="${Math.round(this._volume * 100)}" @drag-end=${this._onDragEndVolume} @position-change=${this._onPositionChangeVolume}></d2l-seek-bar>
							</div>
						</div>
					</div>

					<div class="d2l-labs-media-player-control-element d2l-labs-media-player-control-display" id="d2l-labs-media-player-time">
						${MediaPlayer._formatTime(this._secondsElapsed)} / ${MediaPlayer._formatTime(this._secondsDuration)}
					</div>

					<div id="d2l-labs-media-player-flex-filler"></div>

					<div @mouseenter=${this._startHoveringSpeedContainer} @mouseleave=${this._stopHoveringSpeedContainer}>
						<button class="d2l-labs-media-player-control-element d2l-labs-media-player-control-display d2l-labs-media-player-button" id="d2l-labs-media-player-speed-button">
							${this._speed}x
						</button>

						<div id="d2l-labs-media-player-speed-level-container" ?hidden="${!this._hoveringSpeedContainer}">
							<div id="d2l-labs-media-player-speed-level-background">
								<button class="d2l-labs-media-player-button" value="0.25" @click=${this._updatePlaybackRate}>0.25x</button>
								<button class="d2l-labs-media-player-button" value="0.5" @click=${this._updatePlaybackRate}>0.5x</button>
								<button class="d2l-labs-media-player-button" value="0.75" @click=${this._updatePlaybackRate}>0.75x</button>
								<button class="d2l-labs-media-player-button" value="1" @click=${this._updatePlaybackRate}>Normal</button>
								<button class="d2l-labs-media-player-button" value="1.25" @click=${this._updatePlaybackRate}>1.25x</button>
								<button class="d2l-labs-media-player-button" value="1.5" @click=${this._updatePlaybackRate}>1.5x</button>
								<button class="d2l-labs-media-player-button" value="2" @click=${this._updatePlaybackRate}>2x</button>
							</div>
						</div>
					</div>

					<button ?hidden="${!screenfull.isEnabled}" class="d2l-labs-media-player-control-element d2l-labs-media-player-button" title="${this._getFullscreenTooltip()}" @click=${this._toggleFullscreen}>
						<d2l-icon class="d2l-labs-media-player-control-display" icon="${this._getFullscreenIcon()}"></d2l-icon>
					</button>
				</div>
			</div>
		</div>
		`;
	}

	connectedCallback() {
		super.connectedCallback();

		document.addEventListener('keydown', this._listenForKeyboard);
	}

	disconnectedCallback() {
		super.disconnectedCallback();

		document.removeEventListener('keydown', this._listenForKeyboard);
	}

	firstUpdated() {
		super.firstUpdated();

		this._seekBar = this.shadowRoot.getElementById('d2l-labs-media-player-seek-bar');
		this._video = this.shadowRoot.getElementById('d2l-labs-media-player-video');
		this._videoContainer = this.shadowRoot.getElementById('d2l-labs-media-player-video-container');
		this._volumeLevel = this.shadowRoot.getElementById('d2l-labs-media-player-volume-level');

		this._showControlsTemporarily();
		this._updateTimeElapsed();
	}

	_getFullscreenIcon() {
		return screenfull.isFullscreen ? 'tier1:smallscreen' : 'tier1:fullscreen';
	}

	_getPlayIcon() {
		return this._playing ? 'tier1:pause' : 'tier1:play';
	}

	_getPlayTooltip() {
		return `${this._playing ? this.localize('pause') : this.localize('play')} (${this.localize('spacebar')})`;
	}

	_getFullscreenTooltip() {
		return `${screenfull.isFullscreen ? this.localize('exitFullscreen') : this.localize('fullscreen')} (${MediaPlayer._keyBindings.fullscreen})`;
	}

	_getMuteTooltip() {
		return `${this._muted ? this.localize('unmute') : this.localize('mute')} (${MediaPlayer._keyBindings.mute})`;
	}

	_onDragEndSeek() {
		// _onDragEndSeek() is called once before firstUpdated()
		if (this._seekBar) {
			this._updateCurrentTimeOfVideo(this._seekBar.immediateValue / 100);
		}
	}

	_onPositionChangeSeek() {
		this._updateCurrentTimeOfVideo(this._seekBar.immediateValue / 100);
		this._showControlsTemporarily();
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

		if (this._videoClicked) {
			this._toggleFullscreen();
		} else {
			setTimeout(() => {
				if (this._videoClicked) {
					this._videoClicked = false;
				}
			}, MediaPlayer._timeoutForDoubleClickMs);
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
		if (!screenfull.isEnabled) return;

		if (screenfull.isFullscreen) {
			screenfull.exit();
		} else {
			screenfull.request(this._videoContainer);
		}
	}

	_onLoadedMetadata() {
		this._secondsDuration = Math.floor(this._video.duration);
	}

	_onLoadedData() {
		this.dispatchEvent(new CustomEvent('d2l-labs-media-player-video-load'));
	}

	_updateTimeElapsed() {
		this._secondsElapsed = this._video.currentTime;

		setTimeout(() => this._updateTimeElapsed(), MediaPlayer._seekBarUpdatePeriodMs);
	}

	_listenForKeyboard(e) {
		switch (e.key) {
			case MediaPlayer._keyBindings.play:
				if (!this.shadowRoot.activeElement || this.shadowRoot.activeElement.id !== 'd2l-labs-media-player-play-button') {
					// Pressing spacebar fires a 'click' event on the focused element. If
					// the play button is focused, hitting spacebar would toggle play twice, doing
					// nothing
					this._togglePlay();
				}

				this._showControlsTemporarily();
				break;
			case MediaPlayer._keyBindings.mute:
				this._toggleMute();
				this._showControlsTemporarily();
				break;
			case MediaPlayer._keyBindings.fullscreen:
				this._toggleFullscreen();
				this._showControlsTemporarily();
				break;
		}
	}

	_startHoveringControls() {
		this._hoveringVideoControls = true;
		this._showControls();
	}

	_stopHoveringControls() {
		this._hoveringVideoControls = false;
		this._showControlsTemporarily();
	}

	_showControls() {
		this._hidingControls = false;
		this.lastTimeEntered = Date.now();
		this._videoContainerStyle = { ...this._videoContainerStyle, cursor: 'auto' };
	}

	_showControlsTemporarily() {
		this._showControls();

		setTimeout(() => {
			if (Date.now() - this.lastTimeEntered >= MediaPlayer._hideDelay && !this._hoveringVideoControls && this._playing) {
				this._hidingControls = true;
				this._videoContainerStyle = { ...this._videoContainerStyle, cursor: 'none' };
			}
		}, MediaPlayer._hideDelay);
	}

	_updatePlaybackRate(e) {
		const rate = e.target.value;
		this._speed = rate;
		this._video.playbackRate = rate;
		this._hoveringSpeedContainer = false;
	}

	_startHoveringSpeedContainer() {
		this._hoveringSpeedContainer = true;
	}

	_stopHoveringSpeedContainer() {
		this._hoveringSpeedContainer = false;
	}

	_startHoveringVolumeContainer() {
		this._hoveringVolumeContainer = true;
	}

	_stopHoveringVolumeContainer() {
		this._hoveringVolumeContainer = false;
	}
}

customElements.define('d2l-labs-media-player', MediaPlayer);
