import '@brightspace-ui/core/components/alert/alert.js';
import '@brightspace-ui/core/components/button/button-icon.js';
import '@brightspace-ui/core/components/colors/colors.js';
import '@brightspace-ui/core/components/dropdown/dropdown.js';
import '@brightspace-ui/core/components/dropdown/dropdown-menu.js';
import '@brightspace-ui/core/components/icons/icon.js';
import '@brightspace-ui/core/components/loading-spinner/loading-spinner.js';
import '@brightspace-ui/core/components/menu/menu.js';
import '@brightspace-ui/core/components/menu/menu-item.js';
import '@brightspace-ui/core/components/menu/menu-item-link.js';
import '@brightspace-ui/core/components/menu/menu-item-radio.js';
import '@brightspace-ui/core/components/offscreen/offscreen.js';
import '@d2l/seek-bar/d2l-seek-bar.js';
import './media-player-audio-bars.js';
import { css, html, LitElement } from 'lit-element/lit-element.js';
import { classMap } from 'lit-html/directives/class-map';
import { FocusVisiblePolyfillMixin } from '@brightspace-ui/core/mixins/focus-visible-polyfill-mixin.js';
import fullscreenApi from './src/fullscreen-api';
import { ifDefined } from 'lit-html/directives/if-defined';
import { InternalLocalizeMixin } from './src/mixins/internal-localize-mixin';
import parseSRT from 'parse-srt/src/parse-srt.js';
import ResizeObserver from 'resize-observer-polyfill';
import { RtlMixin } from '@brightspace-ui/core/mixins/rtl-mixin';
import { styleMap } from 'lit-html/directives/style-map';

const FULLSCREEN_ENABLED = fullscreenApi.isEnabled;
const HIDE_DELAY_MS = 3000;
const KEY_BINDINGS = {
	play: 'k',
	mute: 'm',
	fullscreen: 'f'
};
const MESSAGE_TYPES = {
	error: 1,
	success: 2
};
const MIN_TRACK_WIDTH_PX = 250;
const NATIVE_CONTROLS = !document.createElement('video').canPlayType;
const PLAYBACK_SPEEDS = ['0.25', '0.5', '0.75', '1.0', '1.25', '1.5', '2.0'];
const SEEK_BAR_UPDATE_PERIOD_MS = 0;
const SOURCE_TYPES = {
	audio: 'audio',
	unknown: 'unknown',
	video: 'video'
};
const TIMEOUT_FOR_DOUBLE_CLICK_MS = 500;
const TRACK_KINDS = {
	captions: 'captions',
	subtitles: 'subtitles'
};
const Url = URL || window.URL;

class MediaPlayer extends FocusVisiblePolyfillMixin(InternalLocalizeMixin(RtlMixin(LitElement))) {

	static get properties() {
		return {
			allowDownload: { type: Boolean, attribute: 'allow-download', reflect: true },
			autoplay: { type: Boolean },
			loop: { type: Boolean },
			poster: { type: String },
			src: { type: String },
			_currentTime: { type: Number, attribute: false },
			_duration: { type: Number, attribute: false },
			_loading: { type: Boolean, attribute: false },
			_message: { type: Object, attribute: false },
			_muted: { type: Boolean, attribute: false },
			_playbackSpeedMenuValue: { type: String, attribute: false },
			_playing: { type: Boolean, attribute: false },
			_recentlyShowedCustomControls: { type: Boolean, attribute: false },
			_sourceType: { type: String, attribute: false },
			_trackFontSizeRem: { type: Number, attribute: false },
			_trackMenuValue: { type: String, attribute: false },
			_tracks: { type: Array, attribute: false },
			_trackText: { type: String, attribute: false },
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

			#d2l-labs-media-player-media-container {
				min-height: 15rem;
				overflow: hidden;
				position: relative;
				width: 100%;
			}

			.d2l-labs-media-player-type-is-audio {
				background-color: #ffffff;
			}

			.d2l-labs-media-player-type-is-video {
				background-color: #000000;
				color: #ffffff;
			}

			.d2l-labs-media-player-type-is-unknown {
				display: none;
			}

			#d2l-labs-media-player-video {
				display: block;
				height: 100%;
				max-height: 100vh;
				position: relative;
				width: 100%;
			}

			#d2l-labs-media-player-media-controls {
				bottom: 0;
				position: absolute;
				transition: bottom 500ms ease;
				width: 100%;
			}

			.d2l-labs-media-player-type-is-audio #d2l-labs-media-player-media-controls {
				background-color: #ffffff;
			}
			.d2l-labs-media-player-type-is-video #d2l-labs-media-player-media-controls {
				background-color: rgba(0, 0, 0, 0.69);
			}

			#d2l-labs-media-player-media-controls.d2l-labs-media-player-hidden {
				bottom: -8rem;
			}

			#d2l-labs-media-player-seek-bar {
				--d2l-knob-focus-color: #ffffff;
				--d2l-knob-focus-size: 4px;
				--d2l-knob-size: 15px;
				--d2l-outer-knob-color: var(--d2l-color-celestine-plus-1);
				--d2l-progress-border-radius: 0;
				position: absolute;
				top: -9px;
				width: 100%;
				z-index: 1;
			}

			#d2l-labs-media-player-seek-bar:focus {
				--d2l-knob-box-shadow: 0 2px 6px 3px rgba(0, 0, 0, 1);
			}

			#d2l-labs-media-player-buttons {
				align-items: center;
				direction: ltr;
				display: flex;
				flex-direction: row;
				justify-content: space-between;
				margin-left: 6px;
			}

			[dir="rtl"] #d2l-labs-media-player-buttons {
				margin-left: 0;
				margin-right: 6px;
			}

			.d2l-labs-media-player-flex-filler {
				flex: auto;
			}

			d2l-button-icon {
				--d2l-button-icon-min-height: 1.8rem;
				--d2l-button-icon-min-width: 1.8rem;
				margin: 6px 6px 6px 0;
			}

			#d2l-labs-media-player-time {
				line-height: 1rem;
				margin: 0 0.75rem;
			}

			#d2l-labs-media-player-time:hover {
				cursor: auto;
			}

			#d2l-labs-media-player-volume-container {
				position: relative;
			}

			#d2l-labs-media-player-volume-level-container {
				bottom: 1.65rem;
				height: 1rem;
				left: 0;
				position: absolute;
				width: 2rem;
				z-index: 2;
			}

			#d2l-labs-media-player-volume-level-container.d2l-labs-media-player-hidden {
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
				--d2l-knob-focus-color: #ffffff;
				--d2l-knob-focus-size: 4px;
				--d2l-knob-size: 18px;
				--d2l-outer-knob-color: var(--d2l-color-celestine-plus-1);
				position: relative;
				top: 0.5625rem;
			}

			.d2l-labs-media-player-rotated {
				transform: rotate(-90deg);
			}

			#d2l-labs-media-player-audio-bars-container {
				align-items: center;
				display: flex;
				flex-wrap: nowrap;
				height: 8.5rem;
				justify-content: center;
				left: calc(2.1rem + 6px);
				position: absolute;
				top: calc(50% - 5.125rem);
				width: calc(100% - 4.2rem - 12px);
			}

			d2l-labs-media-player-audio-bars {
				height: 2rem;
			}

			#d2l-labs-media-player-track-container {
				align-items: center;
				color: #ffffff;
				display: flex;
				justify-content: center;
				overflow: hidden;
				position: absolute;
				text-align: center;
				transition: bottom 500ms ease;
				width: 100%;
			}

			#d2l-labs-media-player-track-container > div {
				align-items: center;
				display: flex;
				height: 4.05rem;
				justify-content: center;
				min-width: ${MIN_TRACK_WIDTH_PX}px;
				width: 50%;
			}

			#d2l-labs-media-player-track-container > div > span {
				background-color: rgba(0, 0, 0, 0.69);
				box-shadow: 0.3rem 0 0 rgba(0, 0, 0, 0.69), -0.3rem 0 0 rgba(0, 0, 0, 0.69);
				color: white;
				line-height: 1.35rem;
				white-space: pre-wrap;
			}

			#d2l-labs-media-player-audio-play-button-container {
				background-color: white;
				position: absolute;
			}

			#d2l-labs-media-player-audio-play-button {
				background-color: transparent;
				border: none;
				border-radius: 12px;
				padding: 2px;
			}

			#d2l-labs-media-player-audio-play-button:focus {
				outline: none;
			}

			#d2l-labs-media-player-audio-play-button:hover {
				background: var(--d2l-color-mica);
				background-clip: content-box;
				cursor: pointer;
			}

			#d2l-labs-media-player-audio-play-button.focus-visible {
				border: 2px solid var(--d2l-color-celestine);
			}

			#d2l-labs-media-player-audio-play-button > d2l-icon {
				height: 2.75rem;
				width: 2.75rem;
			}

			#d2l-labs-media-player-settings-menu {
				bottom: 2.65rem;
				left: 0.9rem;
			}

			[dir="rtl"] #d2l-labs-media-player-settings-menu {
				left: 0;
				right: -0.8rem;
			}

			.d2l-labs-media-player-full-area-centred {
				align-items: center;
				display: flex;
				height: 100%;
				justify-content: center;
				width: 100%;
			}

			#d2l-labs-media-player-alert-inner {
				display: flex;
				flex-direction: row;
				justify-content: flex-start;
			}

			#d2l-labs-media-player-alert-inner > svg {
				flex-shrink: 0;
				margin-right: 0.5rem;
			}
		`;
	}

	constructor() {
		super();

		this.allowDownload = false;
		this.autoplay = false;
		this.loop = false;
		this._currentTime = 0;
		this._determiningSourceType = true;
		this._duration = 1;
		this._hoveringMediaControls = false;
		this._loading = false;
		this._message = {
			text: null,
			type: null
		};
		this._muted = false;
		this._playbackSpeedMenuValue = '1.0';
		this._playing = false;
		this._recentlyShowedCustomControls = false;
		this._settingsMenu = null;
		this._sourceType = SOURCE_TYPES.unknown;
		this._trackFontSizeRem = 1;
		this._tracks = [];
		this._trackText = null;
		this._usingVolumeContainer = false;
		this._videoClicked = false;
		this._volume = 1;
	}

	get currentTime() {
		return this._currentTime;
	}

	set currentTime(time) {
		this._currentTime = time;
		this._media.currentTime = time;
	}

	firstUpdated(changedProperties) {
		super.firstUpdated(changedProperties);

		if (!this.src) console.warn('d2l-labs-media-player component requires src text');

		this._trackMenuValue = this.localize('off');

		this._mediaContainer = this.shadowRoot.getElementById('d2l-labs-media-player-media-container');
		this._playButton = this.shadowRoot.getElementById('d2l-labs-media-player-play-button');
		this._seekBar = this.shadowRoot.getElementById('d2l-labs-media-player-seek-bar');
		this._settingsMenu = this.shadowRoot.getElementById('d2l-labs-media-player-settings-menu');
		this._speedLevelBackground = this.shadowRoot.getElementById('d2l-labs-media-player-speed-level-background');
		this._volumeLevel = this.shadowRoot.getElementById('d2l-labs-media-player-volume-level');

		this._startUpdatingCurrentTime();

		new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { height, width } = entry.contentRect;
				const multiplier = Math.sqrt(Math.max(1, Math.min(height, width) / MIN_TRACK_WIDTH_PX));
				this._trackFontSizeRem = multiplier;
			}
		}).observe(this._mediaContainer);
	}

	render() {
		const fullscreenIcon = fullscreenApi.isFullscreen ? 'tier1:smallscreen' : 'tier1:fullscreen';
		const playIcon = this._playing ? 'tier1:pause' : 'tier1:play';
		const volumeIcon = this._muted ? 'tier1:volume-muted' : 'tier1:volume';

		const fullscreenTooltip = `${fullscreenApi.isFullscreen ? this.localize('exitFullscreen') : this.localize('fullscreen')} (${KEY_BINDINGS.fullscreen})`;
		const playTooltip = `${this._playing ? this.localize('pause') : this.localize('play')} (${KEY_BINDINGS.play})`;
		const volumeTooltip = `${this._muted ? this.localize('unmute') : this.localize('mute')} (${KEY_BINDINGS.mute})`;

		const mediaContainerStyle = { cursor: !this._hidingCustomControls() || this._sourceType === SOURCE_TYPES.unknown ? 'auto' : 'none' };
		const trackContainerStyle = { bottom: this._hidingCustomControls() ? '3px' : 'calc(1.8rem + 20px)', fontSize: `${this._trackFontSizeRem}rem`, lineHeight: `${this._trackFontSizeRem * 1.2}rem` };

		const mediaContainerClass = { 'd2l-labs-media-player-type-is-audio': this._sourceType === SOURCE_TYPES.audio, 'd2l-labs-media-player-type-is-video': this._sourceType === SOURCE_TYPES.video, 'd2l-labs-media-player-type-is-unknown': this._sourceType === SOURCE_TYPES.unknown };
		const mediaControlsClass = { 'd2l-labs-media-player-hidden': this._hidingCustomControls() };
		const theme = this._sourceType === SOURCE_TYPES.video ? 'dark' : undefined;
		const volumeLevelContainerClass = { 'd2l-labs-media-player-hidden': !this._usingVolumeContainer || this._hidingCustomControls() };

		const fullscreenButton = this._sourceType === SOURCE_TYPES.video ? html`<d2l-button-icon
			class="d2l-dropdown-opener"
			icon="${fullscreenIcon}"
			text="${fullscreenTooltip}"
			theme="${ifDefined(theme)}"
			@click="${this._toggleFullscreen}"></d2l-button-icon>` : null;

		return html`
		<slot @slotchange=${this._onSlotChange}></slot>

		<d2l-offscreen>
			<span role="alert">${this._message.text}</span>
		</d2l-offscreen>

		${this._getErrorAlertView()}

		${this._getLoadingSpinnerView()}

		<div id="d2l-labs-media-player-media-container" class=${classMap(mediaContainerClass)} style=${styleMap(mediaContainerStyle)} @mousemove=${this._onVideoContainerMouseMove} @keydown=${this._listenForKeyboard}>
			${this._getMediaAreaView()}

			<div id="d2l-labs-media-player-track-container" style=${styleMap(trackContainerStyle)} @click=${this._onTrackContainerClick}>
				<div>
					<span role="status">${this._trackText}</span>
				</div>
			</div>

			<div class=${classMap(mediaControlsClass)} id="d2l-labs-media-player-media-controls" ?hidden="${NATIVE_CONTROLS}" @mouseenter=${this._startHoveringControls} @mouseleave=${this._stopHoveringControls}>
				<d2l-seek-bar
					id="d2l-labs-media-player-seek-bar"
					fullWidth
					solid
					value="${Math.floor(this.currentTime / this._duration * 100)}"
					aria-label="${this.localize('seekSlider')}"
					aria-orientation="horizontal"
					aria-valuemin="0"
					aria-valuemax="100"
					aria-valuenow="${Math.floor(this.currentTime / this._duration * 100)}"
					title="${this.localize('seekSlider')}"
					@drag-start=${this._onDragStartSeek}
					@drag-end=${this._onDragEndSeek}
					@position-change=${this._onPositionChangeSeek}
				></d2l-seek-bar>
				<div id="d2l-labs-media-player-buttons">
					<d2l-button-icon icon="${playIcon}" text="${playTooltip}"  @click="${this._togglePlay}" theme="${ifDefined(theme)}"></d2l-button-icon>

					<div id="d2l-labs-media-player-volume-container" @mouseenter="${this._startUsingVolumeContainer}" @mouseleave="${this._stopUsingVolumeContainer}">
						<d2l-button-icon
							class="d2l-dropdown-opener"
							icon="${volumeIcon}"
							text="${volumeTooltip}"
							theme="${ifDefined(theme)}"
							@blur="${this._stopUsingVolumeContainer}"
							@click="${this._toggleMute}"
							@focus="${this._startUsingVolumeContainer}"
						></d2l-button-icon>
						<div id="d2l-labs-media-player-volume-level-container" class=${classMap(volumeLevelContainerClass)}>
							<div class="d2l-labs-media-player-rotated" id="d2l-labs-media-player-volume-level-background">
								<d2l-seek-bar solid
									id="d2l-labs-media-player-volume-level"
									vertical
									value="${Math.round(this._volume * 100)}"
									aria-label="${this.localize('volumeSlider')}"
									aria-orientation="vertical" aria-valuemin="0"
									aria-valuemax="100"
									aria-valuenow="${Math.floor(this._volume * 100)}"
									title="${this.localize('volumeSlider')}"
									@position-change=${this._onPositionChangeVolume}
									@focus=${this._startUsingVolumeContainer}
									@focusout=${this._stopUsingVolumeContainer}
								></d2l-seek-bar>
							</div>
						</div>
					</div>

					<div id="d2l-labs-media-player-time">
						${MediaPlayer._formatTime(this.currentTime)} / ${MediaPlayer._formatTime(this.duration)}
					</div>

					<div class="d2l-labs-media-player-flex-filler"></div>

					<d2l-dropdown>
						<d2l-button-icon class="d2l-dropdown-opener" icon="tier1:gear" text="${this.localize('settings')}" theme="${ifDefined(theme)}"></d2l-button-icon>
						<d2l-dropdown-menu id="d2l-labs-media-player-settings-menu" no-pointer theme="${ifDefined(theme)}">
							<d2l-menu label="${this.localize('settings')}" theme="${ifDefined(theme)}">
								<d2l-menu-item id="d2l-labs-media-player-playback-speeds" text="${this.localize('playbackSpeed')}">
									<div slot="supporting">${this._playbackSpeedMenuValue}</div>
									<d2l-menu @d2l-menu-item-change=${this._onPlaybackSpeedsMenuItemChange} theme="${ifDefined(theme)}">
										${PLAYBACK_SPEEDS.map(speed => html`
											<d2l-menu-item-radio text="${speed === '1.0' ? `1.0 (${this.localize('default')})` : speed}" value="${speed}" ?selected="${speed === '1.0'}"></d2l-menu-item-radio>
										`)}
									</d2l-menu>
								</d2l-menu-item>
								${this._getTracksMenuView()}
								${this._getDownloadButtonView()}
							</d2l-menu>
						</d2l-dropdown-menu>
					</d2l-dropdown>

					${fullscreenButton}

				</div>
			</div>
		</div>
		`;
	}

	updated(changedProperties) {
		super.updated(changedProperties);

		if (changedProperties.has('src')) {
			this._determineSourceType();
		}

		if (changedProperties.has('_sourceType')) {
			if (this._sourceType === SOURCE_TYPES.video) {
				this._media = this.shadowRoot.getElementById('d2l-labs-media-player-video');
			} else if (this._sourceType === SOURCE_TYPES.audio) {
				this._media = this.shadowRoot.getElementById('d2l-labs-media-player-audio');
			} else {
				this._media = null;
			}
		}
	}

	get duration() {
		return this._duration;
	}

	get ended() {
		return this._media.ended;
	}

	exitFullscreen() {
		if (!fullscreenApi.isFullscreen) return;

		this._toggleFullscreen();
	}

	pause() {
		if (!this._media.paused) this._togglePlay();
	}

	get paused() {
		return this._media.paused;
	}

	play() {
		if (this._media.paused) this._togglePlay();
	}

	requestFullscreen() {
		if (fullscreenApi.isFullscreen) return;

		this._toggleFullscreen();
	}

	get sourceType() {
		return this._sourceType;
	}

	_determineSourceType() {
		this._loading = true;
		this._message = {
			text: null,
			type: null
		};
		this._sourceType = SOURCE_TYPES.unknown;
		const video = document.createElement('video');
		video.src = this.src;

		video.addEventListener('canplay', () => {
			this._sourceType = video.videoHeight === 0 ? SOURCE_TYPES.audio : SOURCE_TYPES.video;
		});

		video.addEventListener('error', this._onError.bind(this));
	}

	static _formatTime(totalSeconds) {
		totalSeconds = Math.floor(totalSeconds);

		const str = [];

		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const hours = Math.floor(totalSeconds / 3600);

		if (hours > 0) {
			str.push(`${hours}:`);

			if (minutes < 10) {
				str.push('0');
			}
		}

		str.push(`${minutes}:`);

		const seconds = totalSeconds % 60;
		if (seconds < 10) {
			str.push('0');
		}

		str.push(seconds);

		return str.join('');
	}

	_getAbsoluteUrl(url) {
		const a = document.createElement('a');
		a.setAttribute('href', url);

		return a.href;
	}

	_getDownloadButtonView() {
		if (!this.allowDownload) return null;

		const url = new Url(this._getAbsoluteUrl(this.src));
		const searchParams = url.searchParams;
		searchParams.append('attachment', 'true');
		const linkHref = url.toString();

		return html`
			<d2l-menu-item-link href="${linkHref}" target="_blank" text="${this.localize('download')}" download></d2l-menu-item-link>
		`;
	}

	_getErrorAlertView() {
		return this._message.type === MESSAGE_TYPES.error ? html`
			<div class="d2l-labs-media-player-full-area-centred">
				<d2l-alert button-text="${this.localize('retry')}" type="critical" @d2l-alert-button-press=${this._onAlertButtonPress}>
					<div id="d2l-labs-media-player-alert-inner">
						<svg width="33" height="31" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
							<defs>
								<path d="M4 0h22a4 4 0 014 4v16l-4 1-5-3-5 1-4-3-5 1-4-3-3 1V4a4 4 0 014-4z" id="a"/>
								<path d="M4 13h22a4 4 0 004-4V6l-4 1-5-3-5 1-4-3-5 1-4-3-3 1v8a4 4 0 004 4z" id="c"/>
							</defs>
							<g fill="none" fill-rule="evenodd">
								<g transform="rotate(-3 35.094 -27.188)">
									<mask id="b" fill="#fff">
									<use xlink:href="#a"/>
									</mask>
									<path stroke="#494C4E" d="M26 .5c.966 0 1.841.392 2.475 1.025A3.489 3.489 0 0129.5 4h0v15.61l-3.42.855-4.989-2.993-4.97.994-4-3-5 1-4.03-3.023-2.591.863V4c0-.966.392-1.841 1.025-2.475A3.489 3.489 0 014 .5h0z"/>
									<path d="M26 2c1.103 0 2 .897 2 2v22c0 1.103-.897 2-2 2H4c-1.103 0-2-.897-2-2V4c0-1.103.897-2 2-2h22m0-2H4C1.8 0 0 1.8 0 4v22c0 2.2 1.8 4 4 4h22c2.2 0 4-1.8 4-4V4c0-2.2-1.8-4-4-4z" fill="#494C4E" fill-rule="nonzero" mask="url(#b)"/>
									<path d="M12 9l9 6-9 6V9m0-2a2 2 0 00-2 2v12a2 2 0 003.11 1.664l9-6a2 2 0 00-.001-3.328l-9-6A1.998 1.998 0 0012 7z" fill="#494C4E" fill-rule="nonzero" mask="url(#b)"/>
								</g>
								<g transform="translate(0 18)">
									<mask id="d" fill="#fff">
										<use xlink:href="#c"/>
									</mask>
									<path stroke="#494C4E" d="M2.91.557l3.969 2.977 5-1 4 3 5.03-1.006 5.011 3.007 3.58-.895V9c0 .966-.392 1.841-1.025 2.475A3.489 3.489 0 0126 12.5h0H4a3.489 3.489 0 01-2.475-1.025A3.489 3.489 0 01.5 9h0V1.36L2.91.557z"/>
									<path d="M26-15c1.103 0 2 .897 2 2V9c0 1.103-.897 2-2 2H4c-1.103 0-2-.897-2-2v-22c0-1.103.897-2 2-2h22m0-2H4c-2.2 0-4 1.8-4 4V9c0 2.2 1.8 4 4 4h22c2.2 0 4-1.8 4-4v-22c0-2.2-1.8-4-4-4z" fill="#494C4E" fill-rule="nonzero" mask="url(#d)"/>
									<path d="M12-8l9 6-9 6V-8m0-2a2 2 0 00-2 2V4a2 2 0 003.11 1.664l9-6a2 2 0 00-.001-3.328l-9-6A1.998 1.998 0 0012-10z" fill="#494C4E" fill-rule="nonzero" mask="url(#d)"/>
								</g>
							</g>
						</svg>

						<span>
							${this._message.text}
						</span>
					</div>
				</d2l-alert>
			</div>
		` : null;
	}

	_getLoadingSpinnerView() {
		return this._loading ? html`
			<div class="d2l-labs-media-player-full-area-centred">
				<d2l-loading-spinner size="100"></d2l-loading-spinner>
			</div>
		` : null;
	}

	_getMediaAreaView() {
		const playIcon = `tier3:${this._playing ? 'pause' : 'play'}`;
		const playTooltip = `${this._playing ? this.localize('pause') : this.localize('play')} (${KEY_BINDINGS.play})`;

		switch (this._sourceType) {
			case SOURCE_TYPES.video:
				return html`
					<video
						id="d2l-labs-media-player-video"
						?controls="${NATIVE_CONTROLS}"
						?autoplay="${this.autoplay}"
						?loop="${this.loop}"
						poster="${ifDefined(this.poster)}"
						preload="metadata"
						@click=${this._onVideoClick}
						@ended=${this._onEnded}
						@error=${this._onError}
						@loadeddata=${this._onLoadedData}
						@play=${this._onPlay}
						@pause=${this._onPause}
						@loadedmetadata=${this._onLoadedMetadata}
						@timeupdate=${this._onTimeUpdate}
						@volumechange=${this._onVolumeChange}
					>
						<source src="${this.src}">
					</video>
				`;
			case SOURCE_TYPES.audio:
				return html`
					<audio
						id="d2l-labs-media-player-audio"
						?controls="${NATIVE_CONTROLS}"
						?autoplay="${this.autoplay}"
						?loop="${this.loop}"
						preload="metadata"
						@ended=${this._onEnded}
						@error=${this._onError}
						@loadeddata=${this._onLoadedData}
						@play=${this._onPlay}
						@pause=${this._onPause}
						@loadedmetadata=${this._onLoadedMetadata}
						@timeupdate=${this._onTimeUpdate}
						@volumechange=${this._onVolumeChange}
					>
						<source src="${this.src}"></source>
					</audio>

					<div id="d2l-labs-media-player-audio-bars-container">
						<div id="d2l-labs-media-player-audio-play-button-container">
							<button id="d2l-labs-media-player-audio-play-button" title="${playTooltip}" aria-label="${playTooltip}" @click=${this._togglePlay}>
								<d2l-icon icon="${playIcon}"></d2l-icon>
							</button>
						</div>

						<d2l-labs-media-player-audio-bars ?playing="${this._playing}"></d2l-labs-media-player-audio-bars>
					</div>
				`;
			default:
				return null;
		}
	}

	_getTracksMenuView() {
		const theme = this._sourceType === SOURCE_TYPES.video ? 'dark' : undefined;
		return this._tracks.length > 0 ? html`
			<d2l-menu-item text="${this.localize('captions')}">
				<div slot="supporting">${this._trackMenuValue}</div>
				<d2l-menu @d2l-menu-item-change=${this._onTracksMenuItemChange} theme="${ifDefined(theme)}">
					<d2l-menu-item-radio text="${this.localize('off')}" value="${this.localize('off')}" selected></d2l-menu-item-radio>
					${this._tracks.map(track => html`
						<d2l-menu-item-radio text="${`${track.label}${track.kind === TRACK_KINDS.captions ? ' (CC)' : ''}`}" value="${track.srclang}"></d2l-menu-item-radio>
					`)}
				</d2l-menu>
			</d2l-menu-item>
		` : null;
	}

	_hidingCustomControls() {
		const settingsMenuOpened = this._settingsMenu && this._settingsMenu.opened;
		return NATIVE_CONTROLS || (this._playing && !this._recentlyShowedCustomControls && !this._hoveringMediaControls && !settingsMenuOpened && !this._usingVolumeContainer && this._sourceType === SOURCE_TYPES.video) || this._sourceType === SOURCE_TYPES.unknown;
	}

	_listenForKeyboard(e) {
		this._showControls(true);
		switch (e.key) {
			case KEY_BINDINGS.play:
				this._togglePlay();
				break;
			case KEY_BINDINGS.mute:
				this._toggleMute();
				break;
			case KEY_BINDINGS.fullscreen:
				this._toggleFullscreen();
				break;
		}
	}

	_onAlertButtonPress() {
		this._determineSourceType();
	}

	_onCueChange() {
		for (let i = 0; i < this._media.textTracks.length; i++) {
			if (this._media.textTracks[i].mode === 'hidden') {
				if (this._media.textTracks[i].activeCues.length > 0) {
					this._trackText = this._media.textTracks[i].activeCues[0].text.replace('<br />', '\n');
				} else this._trackText = null;
			}
		}
	}

	_onDragEndSeek() {
		// _onDragEndSeek() is called once before firstUpdated()
		if (this._seekBar) {
			this._updateCurrentTimeFromSeekbarProgress();

			if (this._pausedForSeekDrag) this._media.play();
			this._pausedForSeekDrag = false;
			this._dragging = false;
		}
	}

	_onDragStartSeek() {
		if (this._playing) {
			this._media.pause();
			this._pausedForSeekDrag = true;
		}

		this._dragging = true;
	}

	_onEnded() {
		this.dispatchEvent(new CustomEvent('ended'));
	}

	_onError() {
		this._loading = false;
		this._setLoadErrorMessage();
		this.dispatchEvent(new CustomEvent('error'));
	}

	_onLoadedData() {
		this.dispatchEvent(new CustomEvent('loadeddata'));
	}

	_onLoadedMetadata($event) {
		this._loading = false;
		this._setLoadSuccessMessage();
		this._duration = $event.target.duration;
		this.dispatchEvent(new CustomEvent('loadedmetadata'));
	}

	_onPause() {
		this._playing = false;
		this.dispatchEvent(new CustomEvent('pause'));
	}

	_onPlay() {
		this._playing = true;
		this.dispatchEvent(new CustomEvent('play'));
	}

	_onPlaybackSpeedsMenuItemChange(e) {
		this._media.playbackRate = e.target.value;
		this._playbackSpeedMenuValue = e.target.value;
	}

	_onPositionChangeSeek() {
		this._updateCurrentTimeFromSeekbarProgress();
		this._showControls(true);
	}

	_onPositionChangeVolume() {
		this._media.volume = this._volumeLevel.immediateValue / 100;
	}

	async _onSlotChange(e) {
		this._tracks = [];
		const nodes = e.target.assignedNodes();
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];

			if (node.nodeType !== Node.ELEMENT_NODE || node.nodeName !== 'TRACK') continue;

			if (!(node.kind in TRACK_KINDS)) {
				console.warn(`d2l-labs-media-player component requires 'kind' text on track to be one of ${Object.keys(TRACK_KINDS)}`);
				continue;
			}

			if (!node.label) {
				console.warn("d2l-labs-media-player component requires 'label' text on track");
				continue;
			}

			if (!node.src) {
				console.warn("d2l-labs-media-player component requires 'src' text on track");
				continue;
			}

			if (!node.srclang) {
				console.warn("d2l-labs-media-player component requires 'srclang' text on track");
				continue;
			}

			const res = await fetch(node.src);
			if (res.status !== 200) {
				console.warn(`d2l-labs-media-player component could not load track from '${node.src}'`);
				continue;
			}

			const text = await res.text();

			try {
				node.cues = parseSRT(text);
				node.srt = true;
			} catch (error) {
				node.srt = false;
			}

			this._tracks.push({
				cues: node.cues,
				kind: node.kind,
				label: node.label,
				src: node.src,
				srclang: node.srclang,
				srt: node.srt
			});
		}

		await new Promise(resolve => {
			const interval = setInterval(() => {
				if (!this._media) return;

				clearInterval(interval);

				resolve();
			});
		});

		const oldTracks = this._media.querySelectorAll('track');
		oldTracks.forEach(track => this._media.removeChild(track));

		this._tracks.forEach(track => {
			if (track.srt) {
				const trackElement = this._media.addTextTrack(track.kind, track.label, track.srclang);
				trackElement.oncuechange = this._onCueChange.bind(this);

				track.cues.forEach(cue => {
					trackElement.addCue(new VTTCue(cue.start, cue.end, cue.text));
				});
			} else {
				const trackElement = document.createElement('track');
				trackElement.src = track.src;
				trackElement.label = track.label;
				trackElement.kind = track.kind;
				trackElement.srclang = track.srclang;
				trackElement.oncuechange = this._onCueChange.bind(this);
				this._media.appendChild(trackElement);
			}
		});

		setTimeout(() => {
			for (let i = 0; i < this._media.textTracks.length; i++) {
				this._media.textTracks[i].mode = 'disabled';
			}
		}, 0);
	}

	_onTimeUpdate() {
		this.dispatchEvent(new CustomEvent('timeupdate'));
	}

	_onTrackContainerClick() {
		if (this._sourceType === SOURCE_TYPES.video) this._onVideoClick();
	}

	_onTracksMenuItemChange(e) {
		this._trackMenuValue = e.target.text;

		this._trackText = null;

		for (let i = 0; i < this._media.textTracks.length; i++) {
			if (this._media.textTracks[i].language === e.target.value) {
				this._media.textTracks[i].mode = 'hidden';
			} else {
				this._media.textTracks[i].mode = 'disabled';
			}
		}

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

	_onVideoContainerMouseMove() {
		this._showControls(true);
	}

	_onVolumeChange() {
		this._volume = this._media.volume;

		if (this._volume > 0) {
			this._muted = false;
		}
	}

	_setLoadErrorMessage() {
		this._message = {
			text: this.localize('loadErrorMessage'),
			type: MESSAGE_TYPES.error
		};
	}

	_setLoadSuccessMessage() {
		this._message = {
			text: this.localize('loadSuccessMessage'),
			type: MESSAGE_TYPES.success
		};
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

	_startHoveringControls() {
		this._hoveringMediaControls = true;
		this._showControls(false);
	}

	_startUpdatingCurrentTime() {
		setInterval(() => {
			if (this._media && !this._dragging) {
				this._currentTime = this._media.currentTime;
			}
		}, SEEK_BAR_UPDATE_PERIOD_MS);
	}

	_startUsingVolumeContainer() {
		setTimeout(() => {
			this._usingVolumeContainer = true;
		}, 0);
	}

	_stopHoveringControls() {
		this._hoveringMediaControls = false;
		this._showControls(true);
	}

	_stopUsingVolumeContainer() {
		setTimeout(() => {
			this._usingVolumeContainer = false;
		}, 0);
	}

	_toggleFullscreen() {
		if (!FULLSCREEN_ENABLED) return;

		if (this._sourceType !== SOURCE_TYPES.video) return;

		if (fullscreenApi.isFullscreen) {
			fullscreenApi.exit();
		} else {
			fullscreenApi.request(this._mediaContainer);
		}
	}

	_toggleMute() {
		if (this._muted) {
			this._media.volume = this.preMuteVolume;
		} else {
			this.preMuteVolume = this._media.volume;
			this._media.volume = 0;
		}

		this._muted = !this._muted;
	}

	_togglePlay() {
		if (this._media.paused) {
			this._media.play();
		} else {
			this._media.pause();
		}
	}

	_updateCurrentTimeFromSeekbarProgress() {
		this.currentTime = this._seekBar.immediateValue * this._duration / 100;
	}
}

customElements.define('d2l-labs-media-player', MediaPlayer);
