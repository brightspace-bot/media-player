/* global screenfull */
import '@brightspace-ui/core/components/icons/icon.js';
import '@d2l/seek-bar/d2l-seek-bar.js';
import 'screenfull/dist/screenfull.js';
import '@brightspace-ui/core/components/dropdown/dropdown.js';
import '@brightspace-ui/core/components/dropdown/dropdown-menu.js';
import '@brightspace-ui/core/components/dropdown/dropdown-more.js';
import '@brightspace-ui/core/components/menu/menu.js';
import '@brightspace-ui/core/components/menu/menu-item.js';
import '@brightspace-ui/core/components/menu/menu-item-radio.js';
import './media-player-menu-item.js';
import { css, html, LitElement } from 'lit-element/lit-element.js';
import { ifDefined } from 'lit-html/directives/if-defined';
import { InternalLocalizeMixin } from './src/mixins/internal-localize-mixin';
import ResizeObserver from 'resize-observer-polyfill';
import { RtlMixin } from '@brightspace-ui/core/mixins/rtl-mixin';
import { styleMap } from 'lit-html/directives/style-map';

const FULLSCREEN_ENABLED = screenfull.isEnabled;
const HIDE_DELAY_MS = 3000;
const KEY_BINDINGS = {
	closeMenu: 'Escape',
	play: ' ',
	mute: 'm',
	fullscreen: 'f'
};
const NATIVE_CONTROLS = !document.createElement('video').canPlayType;
const SEEK_BAR_UPDATE_PERIOD_MS = 0;
const TIMEOUT_FOR_DOUBLE_CLICK_MS = 500;

class MediaPlayer extends InternalLocalizeMixin(RtlMixin(LitElement)) {

	static get properties() {
		return {
			autoplay: { type: Boolean },
			loop: { type: Boolean },
			poster: { type: String },
			src: { type: String },
			_currentTime: { type: Number, attribute: false },
			_duration: { type: Number, attribute: false },
			_muted: { type: Boolean, attribute: false },
			_playing: { type: Boolean, attribute: false },
			_recentlyShowedCustomControls: { type: Boolean, attribute: false },
			_settingsMenuContainerBottom: { type: String, attribute: false },
			_settingsMenuContainerHeight: { type: String, attribute: false },
			_usingSettingsMenu: { type: Boolean, attribute: false },
			_usingVolumeContainer: { type: Boolean, attribute: false },
			_volume: { type: Number, attribute: false }
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
				background-color: var(--d2l-color-black);
				min-height: 11rem;
				overflow: hidden;
				position: relative;
			}

			#d2l-labs-media-player-video {
				display: block;
				height: 100%;
				max-height: 100vh;
				position: relative;
				width: 100%;
			}

			#d2l-labs-media-player-video-controls {
				background-color: rgba(0, 0, 0, 0.69);
				bottom: 0;
				position: absolute;
				transition: bottom 500ms ease;
				width: 100%;
			}

			#d2l-labs-media-player-video-controls.hidden {
				bottom: -8rem;
			}

			#d2l-labs-media-player-video-controls > * {
				position: relative;
				top: 0;
			}

			#d2l-labs-media-player-seek-bar {
				--d2l-knob-focus-color: var(--d2l-color-white);
				--d2l-knob-focus-size: 4px;
				--d2l-knob-size: 15px;
				--d2l-outer-knob-color: var(--d2l-color-celestine-plus-1);
				--d2l-progress-border-radius: 0;
				position: absolute;
				top: -9px;
				width: 100%;
				z-index: 1;
			}

			#d2l-labs-media-player-buttons {
				align-items: center;
				direction: ltr;
				display: flex;
				flex-direction: row;
				justify-content: space-between;
			}

			.d2l-labs-media-player-flex-filler {
				flex: auto;
			}

			.d2l-labs-media-player-control-element {
				border-radius: 0.3rem;
				margin: 0.25rem 0 0.25rem 0.25rem;
				padding: 0;
				height: 2rem;
				position: relative;
				width: 2rem;
			}

			.d2l-labs-media-player-control-element-last {
				margin-right: 0.125rem;
			}

			.d2l-labs-media-player-control-element:hover {
				background: rgba(255, 255, 255, 0.25);
				cursor: pointer;
			}

			#d2l-labs-media-player-time {
				margin: 0 0.75rem;
				line-height: 1rem;
			}

			#d2l-labs-media-player-time:hover {
				cursor: auto;
			}

			.d2l-labs-media-player-control-display {
				color: var(--d2l-color-white);
			}

			.d2l-labs-media-player-button {
				border-radius: 0.25rem;
				background-color: transparent;
				border: 0.2rem solid transparent;
				border: none;
				outline: none;
				width: 100%;
				height: 100%;
			}

			.d2l-labs-media-player-button:focus {
				box-shadow: 0 0 0 0.125rem #ffffff;
			}

			.d2l-labs-media-player-button:hover {
				cursor: pointer;
			}

			#d2l-labs-media-player-volume-container {
				padding: 0;
			}

			#d2l-labs-media-player-volume-level-container {
				bottom: 2rem;
				height: 0.5rem;
				left: 0;
				position: absolute;
				width: 2rem;
				z-index: 2;
			}

			#d2l-labs-media-player-volume-level-container.hidden {
				left: -8rem;
			}

			#d2l-labs-media-player-volume-level-background {
				background-color: rgba(0, 0, 0, 0.69);
				border-radius: 0 0.3rem 0.3rem 0;
				bottom: 4.625rem;
				height: 2rem;
				left: -2.625rem;
				padding: 0 0.625rem;
				position: relative;
				width: 6rem;
			}

			#d2l-labs-media-player-volume-level {
				--d2l-knob-focus-color: var(--d2l-color-white);
				--d2l-knob-focus-size: 4px;
				--d2l-knob-size: 18px;
				--d2l-outer-knob-color: var(--d2l-color-celestine-plus-1);
				position: relative;
				top: 0.5625rem;
			}

			#d2l-labs-media-player-volume-button {
				font-size: 1rem;
				position: relative;
				z-index: 1;
			}

			.d2l-labs-media-player-rotated {
				transform: rotate(-90deg);
			}

			#d2l-labs-media-player-settings-menu-container {
				display: flex;
				flex-direction: column;
				position: relative;
				right: 7.5rem;
				width: 11.75rem;
			}

			#d2l-labs-media-player-settings-menu {
				border: 1px solid var(--d2l-color-white);
				bottom: 0;
				left: 0;
				overflow-y: scroll;
				position: relative;
			}

			d2l-labs-media-player-menu-item {
				padding: 0.3rem 0.75rem;
			}

			.d2l-labs-media-player-menu-end {
				background-color: var(--d2l-color-white);
				border-top: 1px solid var(--d2l-color-gypsum);
				height: 10px;
				width: 100%;
			}

			d2l-labs-media-player-menu-item > d2l-menu {
				left: calc(100% + 0.75rem);
				position: absolute;
				top: -1rem;
				width: 11.75rem;
			}

			#d2l-labs-media-player-settings-menu-container.hidden {
				display: none;
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

		this.autoplay = false;
		this.loop = false;
		this.poster = null;
		this.src = null;

		this._currentTime = 0;
		this._duration = 1;
		this._hoveringVideoControls = false;
		this._muted = false;
		this._playing = false;
		this._recentlyShowedCustomControls = false;
		this._settingsMenuContainerHeight = '';
		this._settingsMenuContainerBottom = '';
		this._usingSettingsMenu = false;
		this._usingVolumeContainer = false;
		this._videoClicked = false;
		this._volume = 1;
	}

	get currentTime() {
		return this._currentTime;
	}

	set currentTime(time) {
		this._currentTime = time;
		this._video.currentTime = time;
	}

	get duration() {
		return this._duration;
	}

	render() {
		const fullscreenIcon = screenfull.isFullscreen ? 'tier1:smallscreen' : 'tier1:fullscreen';
		const playIcon = this._playing ? 'tier1:pause' : 'tier1:play';
		const volumeIcon = this._muted ? 'tier1:volume-muted' : 'tier1:volume';

		const fullscreenTooltip = `${screenfull.isFullscreen ? this.localize('exitFullscreen') : this.localize('fullscreen')} (${KEY_BINDINGS.fullscreen})`;
		const playTooltip = `${this._playing ? this.localize('pause') : this.localize('play')} (${this.localize('spacebar')})`;
		const volumeTooltip = `${this._muted ? this.localize('unmute') : this.localize('mute')} (${KEY_BINDINGS.mute})`;

		const settingsMenuContainerStyle = {
			bottom: this._settingsMenuContainerBottom,
			height: this._settingsMenuContainerHeight
		};
		const videoContainerStyle = { cursor: NATIVE_CONTROLS || !this._hidingCustomControls() ? 'auto' : 'none' };

		const volumeLevelContainerClass = !this._usingVolumeContainer || this._hidingCustomControls() ? 'hidden' : '';

		return html`
		<div id="d2l-labs-media-player-video-container" style=${styleMap(videoContainerStyle)} ?hidden="${!this.src}" @mousemove=${this._onVideoContainerMouseMove} @click=${this._videoContainerClicked} @keydown=${this._listenForKeyboard}>
			<video ?controls="${NATIVE_CONTROLS}" id="d2l-labs-media-player-video" ?autoplay="${this.autoplay}" ?loop="${this.loop}" poster="${this.poster ? this.poster : ''}" preload="metadata" @click=${this._onVideoClick} @ended=${this._onEnded} @loadeddata=${this._onLoadedData} @play=${this._onPlay} @pause=${this._onPause} @loadedmetadata=${this._onLoadedMetadata} @timeupdate=${this._onTimeUpdate} @volumechange=${this._onVolumeChange}>
				<source src="${ifDefined(this.src)}">
			</video>

			<div class="${this._hidingCustomControls() ? 'hidden' : ''}" id="d2l-labs-media-player-video-controls" ?hidden="${NATIVE_CONTROLS}" @mouseenter=${this._startHoveringControls} @mouseleave=${this._stopHoveringControls}>
				<d2l-seek-bar fullWidth solid id="d2l-labs-media-player-seek-bar" value="${Math.floor(this.currentTime / this._duration * 100)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(this.currentTime / this._duration * 100)}" @drag-start=${this._onDragStartSeek} @drag-end=${this._onDragEndSeek} @position-change=${this._onPositionChangeSeek}></d2l-seek-bar>
				<div id="d2l-labs-media-player-buttons">
					<div class="d2l-labs-media-player-control-element">
						<button class="d2l-labs-media-player-button" id="d2l-labs-media-player-play-button" title="${playTooltip}" aria-label="${playTooltip}" @click=${this._togglePlay}>
							<d2l-icon class="d2l-labs-media-player-control-display" icon="${playIcon}"></d2l-icon>
						</button>
					</div>

					<div class="d2l-labs-media-player-control-element" id="d2l-labs-media-player-volume-container" @mouseenter=${this._startUsingVolumeContainer} @mouseleave=${this._stopUsingVolumeContainer}>
						<button class="d2l-labs-media-player-button" id="d2l-labs-media-player-volume-button" title="${volumeTooltip}" aria-label="${volumeTooltip}" @click=${this._toggleMute} @focus=${this._startUsingVolumeContainer} @focusout=${this._stopUsingVolumeContainer}>
							<d2l-icon class="d2l-labs-media-player-control-display" icon="${volumeIcon}"></d2l-icon>
						</button>

						<div id="d2l-labs-media-player-volume-level-container" class="${volumeLevelContainerClass}">
							<div class="d2l-labs-media-player-rotated" id="d2l-labs-media-player-volume-level-background">
								<d2l-seek-bar solid id="d2l-labs-media-player-volume-level" vertical="" value="${Math.round(this._volume * 100)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(this._volume * 100)}" @position-change=${this._onPositionChangeVolume} @focus=${this._startUsingVolumeContainer} @focusout=${this._stopUsingVolumeContainer}></d2l-seek-bar>
							</div>
						</div>
					</div>

					<div class="d2l-labs-media-player-control-display" id="d2l-labs-media-player-time">
						${MediaPlayer._formatTime(this.currentTime)} / ${MediaPlayer._formatTime(this.duration)}
					</div>

					<div class="d2l-labs-media-player-flex-filler"></div>

					<div class="d2l-labs-media-player-control-element">
						<button class="d2l-labs-media-player-control-display d2l-labs-media-player-button" id="d2l-labs-media-player-settings-button" label="${this.localize('settings')}" aria-label="${this.localize('settings')}" role="${this.localize('menu')}" @click=${this._settingsButtonClick}>
							<d2l-icon class="d2l-labs-media-player-control-display" icon="tier1:gear"></d2l-icon>
						</button>

						<div id="d2l-labs-media-player-settings-menu-container" class="${this._usingSettingsMenu ? '' : 'hidden'}" style=${styleMap(settingsMenuContainerStyle)}>
							<div class="d2l-labs-media-player-flex-filler"></div>
							<d2l-menu id="d2l-labs-media-player-settings-menu">
								<div class="d2l-labs-media-player-menu-end"></div>
								<d2l-labs-media-player-menu-item id="d2l-labs-media-player-playback-speeds" text="Playback speed" value="1.0" aria-valuenow="1.0" subMenu first>
									<d2l-menu id="d2l-labs-media-player-playback-speeds-menu">
										<d2l-menu-item-radio text="0.25" value="0.25"></d2l-menu-item-radio>
										<d2l-menu-item-radio text="0.5" value="0.5"></d2l-menu-item-radio>
										<d2l-menu-item-radio text="0.75" value="0.75"></d2l-menu-item-radio>
										<d2l-menu-item-radio text="1.0 (${this.localize('default')})" value="1.0" selected></d2l-menu-item-radio>
										<d2l-menu-item-radio text="1.25" value="1.25"></d2l-menu-item-radio>
										<d2l-menu-item-radio text="1.5" value="1.5"></d2l-menu-item-radio>
										<d2l-menu-item-radio text="2" value="2.0"></d2l-menu-item-radio>
										<div class="d2l-labs-media-player-menu-end"></div>
									</d2l-menu>
								</d2l-labs-media-player-menu-item>
								<div class="d2l-labs-media-player-menu-end"></div>
							</d2l-menu>
						</div>
					</div>

					<div id="d2l-labs-media-player-fullscreen" class="d2l-labs-media-player-control-element d2l-labs-media-player-control-element-last">
						<button ?hidden="${!FULLSCREEN_ENABLED}" class="d2l-labs-media-player-button" title="${fullscreenTooltip}" aria-label="${fullscreenTooltip}" @click=${this._toggleFullscreen}>
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

		if (!this.src) console.warn('d2l-labs-media-player component requires src text');

		this._playButton = this.shadowRoot.getElementById('d2l-labs-media-player-play-button');
		this._seekBar = this.shadowRoot.getElementById('d2l-labs-media-player-seek-bar');
		this._settingsMenuContainer = this.shadowRoot.getElementById('d2l-labs-media-player-settings-menu-container');
		this._speedLevelBackground = this.shadowRoot.getElementById('d2l-labs-media-player-speed-level-background');
		this._video = this.shadowRoot.getElementById('d2l-labs-media-player-video');
		this._videoContainer = this.shadowRoot.getElementById('d2l-labs-media-player-video-container');
		this._videoControls = this.shadowRoot.getElementById('d2l-labs-media-player-video-controls');
		this._volumeLevel = this.shadowRoot.getElementById('d2l-labs-media-player-volume-level');

		this._startUpdatingCurrentTime();

		new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { height } = entry.contentRect;
				const fontSize = getComputedStyle(document.documentElement).fontSize;
				const pxPerRem = fontSize.substr(0, fontSize.indexOf('px'));

				const settingsMenuContainerHeightPx = height - 3.75 * pxPerRem;
				this._settingsMenuContainerHeight = `${settingsMenuContainerHeightPx}px`;
				this._settingsMenuContainerBottom = `${settingsMenuContainerHeightPx + 2.5 * pxPerRem + 12}px` ;
			}
		}).observe(this._videoContainer);

		this.shadowRoot.getElementById('d2l-labs-media-player-playback-speeds-menu').addEventListener('d2l-menu-item-change', (e) => {
			this._video.playbackRate = e.target.value;

			this.shadowRoot.getElementById('d2l-labs-media-player-playback-speeds').value = e.target.value;
		});
	}

	play() {
		if (this._video.paused) this._togglePlay();
	}

	pause() {
		if (!this._video.paused) this._togglePlay();
	}

	_videoContainerClicked() {
		if (!this.shadowRoot.activeElement || this.shadowRoot.activeElement.id !== 'd2l-labs-media-player-settings-menu') {
			this._usingSettingsMenu = false;
		}
	}

	_onVideoContainerMouseMove() {
		this._showControls(true);
	}

	_onEnded() {
		this.dispatchEvent(new CustomEvent('ended'));
	}

	_onLoadedData() {
		this.dispatchEvent(new CustomEvent('loadeddata'));
	}

	_onLoadedMetadata() {
		this._duration = Math.floor(this._video.duration);
		this.dispatchEvent(new CustomEvent('loadedmetadata'));
	}

	_onPlay() {
		this._playing = true;
		this.dispatchEvent(new CustomEvent('play'));
	}

	_onPause() {
		this._playing = false;
		this.dispatchEvent(new CustomEvent('pause'));
	}

	_onTimeUpdate() {
		this.dispatchEvent(new CustomEvent('timeupdate'));
	}

	_onDragStartSeek() {
		if (this._playing) {
			this._video.pause();
			this._pausedForSeekDrag = true;
		}
	}

	_onDragEndSeek() {
		// _onDragEndSeek() is called once before firstUpdated()
		if (this._seekBar) {
			this._updateCurrentTimeFromSeekbarProgress();

			if (this._pausedForSeekDrag) this._video.play();
			this._pausedForSeekDrag = false;
		}
	}

	_onPositionChangeSeek() {
		this._updateCurrentTimeFromSeekbarProgress();
		this._showControls(true);
	}

	_updateCurrentTimeFromSeekbarProgress() {
		this.currentTime = this._seekBar.immediateValue * this._duration / 100;
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

	_onVideoClick() {
		this._togglePlay();
		this._showControls(true);
		this._playButton.focus();

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
		if (!FULLSCREEN_ENABLED) return;

		if (screenfull.isFullscreen) {
			screenfull.exit();
		} else {
			screenfull.request(this._videoContainer);
		}
	}

	_startUpdatingCurrentTime() {
		setInterval(() => {
			this._currentTime = this._video.currentTime;
		}, SEEK_BAR_UPDATE_PERIOD_MS);
	}

	_listenForKeyboard(e) {
		this._showControls(true);
		switch (e.key) {
			case KEY_BINDINGS.play:
				e.preventDefault();
				this._togglePlay();
				break;
			case KEY_BINDINGS.mute:
				this._toggleMute();
				break;
			case KEY_BINDINGS.fullscreen:
				this._toggleFullscreen();
				break;
			case KEY_BINDINGS.closeMenu:
				if (['d2l-labs-media-player-playback-speeds', 'd2l-labs-media-player-closed-captions', 'd2l-labs-media-player-quality'].includes(this.shadowRoot.activeElement.id)) this._stopUsingSettingsMenu();
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

	_startUsingSettingsMenu() {
		setTimeout(() => {
			this._usingSettingsMenu = true;
			setTimeout(() => {
				this.shadowRoot.getElementById('d2l-labs-media-player-playback-speeds').focus();
			}, 0);
		}, 0);
	}

	_stopUsingSettingsMenu() {
		setTimeout(() => {
			this._usingSettingsMenu = false;
		}, 0);
	}

	_settingsButtonClick() {
		if (this._usingSettingsMenu) {
			this._stopUsingSettingsMenu();
		} else {
			this._startUsingSettingsMenu();
		}
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
		return NATIVE_CONTROLS || (this._playing && !this._recentlyShowedCustomControls && !this._hoveringVideoControls && !this._usingSettingsMenu && !this._usingVolumeContainer);
	}
}

customElements.define('d2l-labs-media-player', MediaPlayer);
