import '@brightspace-ui/core/components/icons/icon.js';
import '@d2l/seek-bar/d2l-seek-bar.js';
import '@brightspace-ui/core/components/menu/menu.js';
import '@brightspace-ui/core/components/menu/menu-item.js';
import '@brightspace-ui/core/components/menu/menu-item-radio.js';
import './media-player-menu-item.js';
import './media-player-audio-bars.js';
import { css, html, LitElement } from 'lit-element/lit-element.js';
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
	closeMenu: 'Escape',
	play: 'k',
	mute: 'm',
	fullscreen: 'f'
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
			_playbackSpeedMenuValue: { type: String, attribute: false },
			_playing: { type: Boolean, attribute: false },
			_recentlyShowedCustomControls: { type: Boolean, attribute: false },
			_settingsMenuContainerBottom: { type: String, attribute: false },
			_settingsMenuContainerHeight: { type: String, attribute: false },
			_settingsMenuVisibility: { type: String, attribute: false },
			_sourceType: { type: String, attribute: false },
			_trackFontSizeRem: { type: Number, attribute: false },
			_trackMenuValue: { type: String, attribute: false },
			_tracks: { type: Array, attribute: false },
			_trackText: { type: String, attribute: false },
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

			#d2l-labs-media-player-media-container {
				min-height: 11rem;
				overflow: hidden;
				position: relative;
				width: 100%;
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

			#d2l-labs-media-player-media-controls.hidden {
				bottom: -8rem;
			}

			#d2l-labs-media-player-media-controls > * {
				position: relative;
				top: 0;
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
				cursor: pointer;
			}

			.d2l-labs-media-player-control-element.audio:hover {
				background: #CDD5DC;
			}

			.d2l-labs-media-player-control-element.video:hover {
				background: rgba(255, 255, 255, 0.25);
			}

			#d2l-labs-media-player-time {
				margin: 0 0.75rem;
				line-height: 1rem;
			}

			#d2l-labs-media-player-time:hover {
				cursor: auto;
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

			.d2l-labs-media-player-button.audio:focus {
				box-shadow: 0 0 0 0.125rem #006fbf;
			}

			.d2l-labs-media-player-button.video:focus {
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
				--d2l-knob-focus-color: #ffffff;
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
				position: absolute;
				right: 0.2rem;
				top: 0.2rem;
				width: 12.5rem;
			}

			#d2l-labs-media-player-settings-menu {
				border: 1px solid #ffffff;
				bottom: 0;
				left: 0;
				overflow-y: scroll;
				position: relative;
			}

			d2l-labs-media-player-menu-item {
				padding: 0.3rem 0.75rem;
			}

			.d2l-labs-media-player-menu-end {
				background-color: #ffffff;
				border-top: 1px solid var(--d2l-color-gypsum);
				height: 10px;
				width: 100%;
			}

			d2l-labs-media-player-menu-item > d2l-menu {
				left: calc(100% + 0.75rem);
				position: absolute;
				width: 12.5rem;
			}

			#d2l-labs-media-player-playback-speeds-menu {
				top: -1rem;
			}

			#d2l-labs-media-player-tracks-menu {
				top: -3.6rem;
			}

			.d2l-labs-media-player-hidden {
				display: none !important;
			}

			#d2l-labs-media-player-audio-bars-container {
				align-items: center;
				display: flex;
				flex-wrap: nowrap;
				height: 8.5rem;
				justify-content: center;
				width: 100%;
			}

			#d2l-labs-media-player-track-container {
				align-items: center;
				bottom: 3rem;
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
				min-width: ${MIN_TRACK_WIDTH_PX}px;
				width: 50%;
			}

			#d2l-labs-media-player-track-container > div > span {
				background-color: rgba(0, 0, 0, 0.69);
				color: white;
				box-shadow: 0.3rem 0 0 rgba(0, 0, 0, 0.69), -0.3rem 0 0 rgba(0, 0, 0, 0.69);
				white-space: pre-wrap;
			}
		`;
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

	constructor() {
		super();

		this.autoplay = false;
		this.loop = false;
		this._currentTime = 0;
		this._determiningSourceType = true;
		this._duration = 1;
		this._hoveringMediaControls = false;
		this._muted = false;
		this._playbackSpeedMenuValue = '1.0';
		this._playing = false;
		this._recentlyShowedCustomControls = false;
		this._settingsMenuContainerHeight = '';
		this._settingsMenuContainerBottom = '';
		this._settingsMenuVisibility = 'visible';
		this._sourceType = SOURCE_TYPES.unknown;
		this._trackFontSizeRem = 1;
		this._tracks = [];
		this._trackText = null;
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
		this._media.currentTime = time;
	}

	get duration() {
		return this._duration;
	}

	render() {
		const fullscreenIcon = fullscreenApi.isFullscreen ? 'tier1:smallscreen' : 'tier1:fullscreen';
		const playIcon = this._playing ? 'tier1:pause' : 'tier1:play';
		const volumeIcon = this._muted ? 'tier1:volume-muted' : 'tier1:volume';

		const fullscreenTooltip = `${fullscreenApi.isFullscreen ? this.localize('exitFullscreen') : this.localize('fullscreen')} (${KEY_BINDINGS.fullscreen})`;
		const playTooltip = `${this._playing ? this.localize('pause') : this.localize('play')} (${KEY_BINDINGS.play})`;
		const volumeTooltip = `${this._muted ? this.localize('unmute') : this.localize('mute')} (${KEY_BINDINGS.mute})`;

		const controlDisplayStyle = { color: this._sourceType === SOURCE_TYPES.video ? '#ffffff' : '#494c4e' };
		const mediaContainerStyle = { backgroundColor: this._sourceType === SOURCE_TYPES.audio ? '#ffffff' : 'black', cursor: NATIVE_CONTROLS || !this._hidingCustomControls() ? 'auto' : 'none' };
		const mediaControlsStyle = { backgroundColor: this._sourceType === SOURCE_TYPES.video ? 'rgba(0, 0, 0, 0.69)' : '#ffffff' };
		const settingsMenuContainerStyle = {
			bottom: this._settingsMenuContainerBottom,
			height: this._settingsMenuContainerHeight
		};
		const settingsMenuStyle = { visibility: this._settingsMenuVisibility };
		const trackContainerStyle = { bottom: this._hidingCustomControls() ? '1rem' : '3rem', fontSize: `${this._trackFontSizeRem}rem`, lineHeight: `${this._trackFontSizeRem * 1.2}rem` };

		const volumeLevelContainerClass = !this._usingVolumeContainer || this._hidingCustomControls() ? 'hidden' : '';
		const playerButtonClass = `d2l-labs-media-player-button ${this._sourceType === SOURCE_TYPES.video ? 'video' : 'audio'}`;

		return html`
		<slot @slotchange=${this._onSlotChange}></slot>

		<div id="d2l-labs-media-player-media-container" style=${styleMap(mediaContainerStyle)} @mousemove=${this._onVideoContainerMouseMove} @click=${this._mediaContainerClicked} @keydown=${this._listenForKeyboard}>
			${this._getMediaAreaView()}

			<div id="d2l-labs-media-player-track-container" style=${styleMap(trackContainerStyle)} @click=${this._onTrackContainerClick}>
				<div>
					<span role="status">${this._trackText}</span>
				</div>
			</div>

			<div class="${this._hidingCustomControls() ? 'hidden' : ''}" id="d2l-labs-media-player-media-controls" ?hidden="${NATIVE_CONTROLS}" style=${styleMap(mediaControlsStyle)} @mouseenter=${this._startHoveringControls} @mouseleave=${this._stopHoveringControls}>
				<d2l-seek-bar fullWidth solid id="d2l-labs-media-player-seek-bar" value="${Math.floor(this.currentTime / this._duration * 100)}" aria-label="${this.localize('seekSlider')}" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(this.currentTime / this._duration * 100)}" title="${this.localize('seekSlider')}" @drag-start=${this._onDragStartSeek} @drag-end=${this._onDragEndSeek} @position-change=${this._onPositionChangeSeek}></d2l-seek-bar>
				<div id="d2l-labs-media-player-buttons">
					<div class="d2l-labs-media-player-control-element">
						<button class="${playerButtonClass}" id="d2l-labs-media-player-play-button" title="${playTooltip}" aria-label="${playTooltip}" @click=${this._togglePlay}>
							<d2l-icon icon="${playIcon}" style=${styleMap(controlDisplayStyle)}></d2l-icon>
						</button>
					</div>

					<div class="d2l-labs-media-player-control-element" id="d2l-labs-media-player-volume-container" @mouseenter=${this._startUsingVolumeContainer} @mouseleave=${this._stopUsingVolumeContainer}>
						<button class="${playerButtonClass}" id="d2l-labs-media-player-volume-button" title="${volumeTooltip}" aria-label="${volumeTooltip}" @click=${this._toggleMute} @focus=${this._startUsingVolumeContainer} @focusout=${this._stopUsingVolumeContainer}>
							<d2l-icon icon="${volumeIcon}" style=${styleMap(controlDisplayStyle)}></d2l-icon>
						</button>

						<div id="d2l-labs-media-player-volume-level-container" class="${volumeLevelContainerClass}">
							<div class="d2l-labs-media-player-rotated" id="d2l-labs-media-player-volume-level-background">
								<d2l-seek-bar solid id="d2l-labs-media-player-volume-level" vertical value="${Math.round(this._volume * 100)}" aria-label="${this.localize('volumeSlider')}" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(this._volume * 100)}" title="${this.localize('volumeSlider')}" @position-change=${this._onPositionChangeVolume} @focus=${this._startUsingVolumeContainer} @focusout=${this._stopUsingVolumeContainer}></d2l-seek-bar>
							</div>
						</div>
					</div>

					<div id="d2l-labs-media-player-time" style=${styleMap(controlDisplayStyle)}>
						${MediaPlayer._formatTime(this.currentTime)} / ${MediaPlayer._formatTime(this.duration)}
					</div>

					<div class="d2l-labs-media-player-flex-filler"></div>

					<div class="d2l-labs-media-player-control-element ${this._sourceType !== SOURCE_TYPES.video ? 'd2l-labs-media-player-control-element-last' : ''}">
						<button class="${playerButtonClass}" id="d2l-labs-media-player-settings-button" label="${this.localize('settings')}" style=${styleMap(controlDisplayStyle)} aria-label="${this.localize('settings')}" @click=${this._settingsButtonClick}>
							<d2l-icon icon="tier1:gear" style=${styleMap(controlDisplayStyle)}></d2l-icon>
						</button>
					</div>

					<div id="d2l-labs-media-player-fullscreen" class="d2l-labs-media-player-control-element d2l-labs-media-player-control-element-last" ?hidden="${this._sourceType !== SOURCE_TYPES.video}">
						<button ?hidden="${!FULLSCREEN_ENABLED}" class="${playerButtonClass}" title="${fullscreenTooltip}" aria-label="${fullscreenTooltip}" @click=${this._toggleFullscreen}>
							<d2l-icon icon="${fullscreenIcon}" style=${styleMap(controlDisplayStyle)}></d2l-icon>
						</button>
					</div>
				</div>
			</div>

			<div id="d2l-labs-media-player-settings-menu-container" class="${this._usingSettingsMenu ? '' : 'd2l-labs-media-player-hidden'}" style=${styleMap(settingsMenuContainerStyle)}>
				<div class="d2l-labs-media-player-flex-filler"></div>
				<d2l-menu id="d2l-labs-media-player-settings-menu" label="${this.localize('settings')}" style=${styleMap(settingsMenuStyle)}>
					<div class="d2l-labs-media-player-menu-end"></div>
					<d2l-labs-media-player-menu-item id="d2l-labs-media-player-playback-speeds" text="${this.localize('playbackSpeed')}" value="${this._playbackSpeedMenuValue}" aria-valuenow="${this._playbackSpeedMenuValue}" subMenu>
						<d2l-menu id="d2l-labs-media-player-playback-speeds-menu" @d2l-menu-item-change=${this._onPlaybackSpeedsMenuItemChange}>
							${PLAYBACK_SPEEDS.map(speed => html`
								<d2l-menu-item-radio text="${speed === '1.0' ? `1.0 (${this.localize('default')})` : speed}" value="${speed}" ?selected="${speed === '1.0'}"></d2l-menu-item-radio>
							`)}
						</d2l-menu>
					</d2l-labs-media-player-menu-item>

					${this._getTracksMenuView()}

					<div class="d2l-labs-media-player-menu-end"></div>
				</d2l-menu>
			</div>
		</div>
		`;
	}

	firstUpdated(changedProperties) {
		super.firstUpdated(changedProperties);

		if (!this.src) console.warn('d2l-labs-media-player component requires src text');

		this._trackMenuValue = this.localize('off');

		this._mediaContainer = this.shadowRoot.getElementById('d2l-labs-media-player-media-container');
		this._playButton = this.shadowRoot.getElementById('d2l-labs-media-player-play-button');
		this._seekBar = this.shadowRoot.getElementById('d2l-labs-media-player-seek-bar');
		this._settingsMenuContainer = this.shadowRoot.getElementById('d2l-labs-media-player-settings-menu-container');
		this._speedLevelBackground = this.shadowRoot.getElementById('d2l-labs-media-player-speed-level-background');
		this._volumeLevel = this.shadowRoot.getElementById('d2l-labs-media-player-volume-level');

		this._startUpdatingCurrentTime();

		new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { height, width } = entry.contentRect;
				const fontSize = getComputedStyle(document.documentElement).fontSize;
				const pxPerRem = fontSize.substr(0, fontSize.indexOf('px'));

				const settingsMenuContainerHeightPx = height - 2.7 * pxPerRem - 15;
				this._settingsMenuContainerHeight = `${settingsMenuContainerHeightPx}px`;

				const multiplier = Math.sqrt(Math.max(1, Math.min(height, width) / MIN_TRACK_WIDTH_PX));
				this._trackFontSizeRem = multiplier;
			}
		}).observe(this._mediaContainer);
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

	play() {
		if (this._media.paused) this._togglePlay();
	}

	pause() {
		if (!this._media.paused) this._togglePlay();
	}

	_mediaContainerClicked() {
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

	_onLoadedMetadata($event) {
		this._duration = $event.target.duration;
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
			this._media.pause();
			this._pausedForSeekDrag = true;
		}

		this._dragging = true;
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

	_onPositionChangeSeek() {
		this._updateCurrentTimeFromSeekbarProgress();
		this._showControls(true);
	}

	_updateCurrentTimeFromSeekbarProgress() {
		this.currentTime = this._seekBar.immediateValue * this._duration / 100;
	}

	_onPositionChangeVolume() {
		this._media.volume = this._volumeLevel.immediateValue / 100;
	}

	_onVolumeChange() {
		this._volume = this._media.volume;

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
				trackElement.mode = 'disabled';
				trackElement.oncuechange = this._onCueChange.bind(this);

				track.cues.forEach(cue => {
					trackElement.addCue(new VTTCue(cue.start, cue.end, cue.text));
				});
			} else {
				const trackElement = document.createElement('track');
				trackElement.mode = 'disabled';
				trackElement.src = track.src;
				trackElement.label = track.label;
				trackElement.kind = track.kind;
				trackElement.srclang = track.srclang;
				trackElement.oncuechange = this._onCueChange.bind(this);
				this._media.appendChild(trackElement);
			}
		});
	}

	_onPlaybackSpeedsMenuItemChange(e) {
		this._media.playbackRate = e.target.value;
		this._playbackSpeedMenuValue = e.target.value;

		this._onMenuItemChange();
	}

	_onTracksMenuItemChange(e) {
		this._trackMenuValue = e.target.text;

		for (let i = 0; i < this._media.textTracks.length; i++) {
			if (this._media.textTracks[i].language === e.target.value && this._media.textTracks[i].mode === 'hidden') {
				this._onMenuItemChange();
				return;
			}
		}

		this._trackText = null;

		for (let i = 0; i < this._media.textTracks.length; i++) {
			if (this._media.textTracks[i].language === e.target.value) {
				this._media.textTracks[i].mode = 'hidden';
			} else {
				this._media.textTracks[i].mode = 'disabled';
			}
		}

		this._onMenuItemChange();
	}

	_onMenuItemChange() {
		this._settingsMenuVisibility = 'hidden';
		this.shadowRoot.getElementById('d2l-labs-media-player-settings-menu').show();
		setTimeout(() => {
			this._settingsMenuVisibility = 'visible';
			this._stopUsingSettingsMenu();
		}, 500);
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

	_onTrackContainerClick() {
		if (this._sourceType === SOURCE_TYPES.video) this._onVideoClick();
	}

	_togglePlay() {
		if (this._media.paused) {
			this._media.play();
		} else {
			this._media.pause();
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

	_toggleFullscreen() {
		if (!FULLSCREEN_ENABLED) return;

		if (fullscreenApi.isFullscreen) {
			fullscreenApi.exit();
		} else {
			fullscreenApi.request(this._mediaContainer);
		}
	}

	_startUpdatingCurrentTime() {
		setInterval(() => {
			if (this._media && !this._dragging) {
				this._currentTime = this._media.currentTime;
			}
		}, SEEK_BAR_UPDATE_PERIOD_MS);
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
			case KEY_BINDINGS.closeMenu:
				if (['d2l-labs-media-player-playback-speeds', 'd2l-labs-media-player-tracks'].includes(this.shadowRoot.activeElement.id)) this._stopUsingSettingsMenu();
				break;
		}
	}

	_startHoveringControls() {
		this._hoveringMediaControls = true;
		this._showControls(false);
	}

	_stopHoveringControls() {
		this._hoveringMediaControls = false;
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
		this._usingSettingsMenu = false;
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
		return NATIVE_CONTROLS || (this._playing && !this._recentlyShowedCustomControls && !this._hoveringMediaControls && !this._usingSettingsMenu && !this._usingVolumeContainer && this._sourceType === SOURCE_TYPES.video) || this._sourceType === SOURCE_TYPES.unknown;
	}

	_determineSourceType() {
		this._sourceType = SOURCE_TYPES.unknown;
		const video = document.createElement('video');
		video.src = this.src;
		video.addEventListener('canplay', () => {
			this._sourceType = video.videoHeight === 0 ? SOURCE_TYPES.audio : SOURCE_TYPES.video;
		});
		video.addEventListener('error', (e) => console.log(e));
	}

	_getMediaAreaView() {
		switch (this._sourceType) {
			case SOURCE_TYPES.video:
				return html`
					<video crossorigin="anonymous" ?controls="${NATIVE_CONTROLS}" id="d2l-labs-media-player-video" ?autoplay="${this.autoplay}" ?loop="${this.loop}" poster="${ifDefined(this.poster)}" preload="metadata" @click=${this._onVideoClick} @ended=${this._onEnded} @loadeddata=${this._onLoadedData} @play=${this._onPlay} @pause=${this._onPause} @loadedmetadata=${this._onLoadedMetadata} @timeupdate=${this._onTimeUpdate} @volumechange=${this._onVolumeChange}>
						<source src="${this.src}">
					</video>
				`;
			case SOURCE_TYPES.audio:
				return html`
					<audio crossorigin="anonymous" id="d2l-labs-media-player-audio" ?controls="${NATIVE_CONTROLS}" ?autoplay="${this.autoplay}" ?loop="${this.loop}" preload="metadata" @ended=${this._onEnded} @loadeddata=${this._onLoadedData} @play=${this._onPlay} @pause=${this._onPause} @loadedmetadata=${this._onLoadedMetadata} @timeupdate=${this._onTimeUpdate} @volumechange=${this._onVolumeChange}>
						<source src="${this.src}"></source>
					</audio>

					<div id="d2l-labs-media-player-audio-bars-container">
						<d2l-labs-media-player-audio-bars ?playing="${this._playing}"></d2l-labs-media-player-audio-bars>
					</div>
				`;
			default:
				return null;
		}
	}

	_getTracksMenuView() {
		return this._tracks.length > 0 ? html`
			<d2l-labs-media-player-menu-item id="d2l-labs-media-player-tracks" text="${this.localize('subtitles')}" value="${this._trackMenuValue}" aria-valuenow="${this._trackMenuValue}" subMenu>
				<d2l-menu id="d2l-labs-media-player-tracks-menu" @d2l-menu-item-change=${this._onTracksMenuItemChange}>
					<d2l-menu-item-radio text="${this.localize('off')}" value="${this.localize('off')}" selected></d2l-menu-item-radio>
					${this._tracks.map(track => html`
						<d2l-menu-item-radio text="${`${track.label}${track.kind === TRACK_KINDS.captions ? ' (CC)' : ''}`}" value="${track.srclang}"></d2l-menu-item-radio>
					`)}
				</d2l-menu>
			</d2l-labs-media-player-menu-item>
		` : null;
	}
}

customElements.define('d2l-labs-media-player', MediaPlayer);
