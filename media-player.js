import '@brightspace-ui/core/components/alert/alert.js';
import '@brightspace-ui/core/components/button/button-icon.js';
import '@brightspace-ui/core/components/colors/colors.js';
import '@brightspace-ui/core/components/dropdown/dropdown.js';
import '@brightspace-ui/core/components/dropdown/dropdown-menu.js';
import '@brightspace-ui/core/components/icons/icon.js';
import '@brightspace-ui/core/components/menu/menu.js';
import '@brightspace-ui/core/components/menu/menu-item.js';
import '@brightspace-ui/core/components/menu/menu-item-radio.js';
import '@brightspace-ui/core/components/offscreen/offscreen.js';
import '@d2l/seek-bar/d2l-seek-bar.js';
import './media-player-audio-bars.js';
import { css, html, LitElement } from 'lit-element/lit-element.js';
import { classMap } from 'lit-html/directives/class-map';
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

class MediaPlayer extends InternalLocalizeMixin(RtlMixin(LitElement)) {

	static get properties() {
		return {
			allowDownload: { type: Boolean, attribute: 'allow-download', reflect: true },
			autoplay: { type: Boolean },
			loop: { type: Boolean },
			poster: { type: String },
			src: { type: String },
			_currentTime: { type: Number, attribute: false },
			_duration: { type: Number, attribute: false },
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
				min-height: 11rem;
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

			#d2l-labs-media-player-media-controls.hidden {
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
				margin: 0 0.75rem;
				line-height: 1rem;
			}

			#d2l-labs-media-player-time:hover {
				cursor: auto;
			}

			#d2l-labs-media-player-volume-container {
				position: relative;
			}

			#d2l-labs-media-player-volume-level-container {
				bottom: 2.15rem;
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
				position: relative;
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
				min-width: ${MIN_TRACK_WIDTH_PX}px;
				width: 50%;
			}

			#d2l-labs-media-player-track-container > div > span {
				background-color: rgba(0, 0, 0, 0.69);
				color: white;
				box-shadow: 0.3rem 0 0 rgba(0, 0, 0, 0.69), -0.3rem 0 0 rgba(0, 0, 0, 0.69);
				white-space: pre-wrap;
			}

			#d2l-labs-media-player-audio-play-button-container {
				background-color: white;
				border-radius: 9px;
				padding: 0px;
				position: absolute;
			}

			#d2l-labs-media-player-audio-play-button {
				border-radius: 9px;
				align-items: center;
				border: none;
				display: flex;
				height: 2.75rem;
				justify-content: center;
				margin: 0;
				width: 2.75rem;
			}

			#d2l-labs-media-player-audio-play-button:hover {
				background: var(--d2l-color-mica);
				background-clip: content-box;
				cursor: pointer;
			}

			#d2l-labs-media-player-audio-play-button > d2l-icon {
				height: 2.75rem;
				width: 2.75rem;
			}

			#d2l-labs-media-player-settings-menu {
				left: 0.9rem;
				bottom: 2.65rem;
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

		this.allowDownload = false;
		this.autoplay = false;
		this.loop = false;
		this._currentTime = 0;
		this._determiningSourceType = true;
		this._duration = 1;
		this._hoveringMediaControls = false;
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

	get duration() {
		return this._duration;
	}

	get ended() {
		return this._media.ended;
	}

	get paused() {
		return this._media.paused;
	}

	get sourceType() {
		return this._sourceType;
	}

	render() {
		const fullscreenIcon = fullscreenApi.isFullscreen ? 'tier1:smallscreen' : 'tier1:fullscreen';
		const playIcon = this._playing ? 'tier1:pause' : 'tier1:play';
		const volumeIcon = this._muted ? 'tier1:volume-muted' : 'tier1:volume';

		const fullscreenTooltip = `${fullscreenApi.isFullscreen ? this.localize('exitFullscreen') : this.localize('fullscreen')} (${KEY_BINDINGS.fullscreen})`;
		const playTooltip = `${this._playing ? this.localize('pause') : this.localize('play')} (${KEY_BINDINGS.play})`;
		const volumeTooltip = `${this._muted ? this.localize('unmute') : this.localize('mute')} (${KEY_BINDINGS.mute})`;

		const mediaContainerStyle = { cursor: !this._hidingCustomControls() || this._sourceType === SOURCE_TYPES.unknown ? 'auto' : 'none' };
		const trackContainerStyle = { bottom: this._hidingCustomControls() ? '9px' : '3rem', fontSize: `${this._trackFontSizeRem}rem`, lineHeight: `${this._trackFontSizeRem * 1.2}rem` };

		const mediaContainerClass = { 'd2l-labs-media-player-type-is-audio': this._sourceType === SOURCE_TYPES.audio, 'd2l-labs-media-player-type-is-video': this._sourceType === SOURCE_TYPES.video, 'd2l-labs-media-player-type-is-unknown': this._sourceType === SOURCE_TYPES.unknown };
		const mediaControlsClass = { hidden: this._hidingCustomControls() };
		const theme = this._sourceType === SOURCE_TYPES.video ? 'dark' : undefined;
		const volumeLevelContainerClass = { hidden: !this._usingVolumeContainer || this._hidingCustomControls() };

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

		<div id="d2l-labs-media-player-media-container" class=${classMap(mediaContainerClass)} style=${styleMap(mediaContainerStyle)} @mousemove=${this._onVideoContainerMouseMove} @keydown=${this._listenForKeyboard}>
			${this._getMediaAreaView()}

			<div id="d2l-labs-media-player-track-container" style=${styleMap(trackContainerStyle)} @click=${this._onTrackContainerClick}>
				<div>
					<span role="status">${this._trackText}</span>
				</div>
			</div>

			<div class=${classMap(mediaControlsClass)} id="d2l-labs-media-player-media-controls" ?hidden="${NATIVE_CONTROLS}" @mouseenter=${this._startHoveringControls} @mouseleave=${this._stopHoveringControls}>
				<d2l-seek-bar fullWidth solid id="d2l-labs-media-player-seek-bar" value="${Math.floor(this.currentTime / this._duration * 100)}" aria-label="${this.localize('seekSlider')}" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(this.currentTime / this._duration * 100)}" title="${this.localize('seekSlider')}" @drag-start=${this._onDragStartSeek} @drag-end=${this._onDragEndSeek} @position-change=${this._onPositionChangeSeek}></d2l-seek-bar>
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
							@focus="${this._startUsingVolumeContainer}"></d2l-button-icon>
						<div id="d2l-labs-media-player-volume-level-container" class=${classMap(volumeLevelContainerClass)}>
							<div class="d2l-labs-media-player-rotated" id="d2l-labs-media-player-volume-level-background">
								<d2l-seek-bar solid id="d2l-labs-media-player-volume-level" vertical value="${Math.round(this._volume * 100)}" aria-label="${this.localize('volumeSlider')}" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(this._volume * 100)}" title="${this.localize('volumeSlider')}" @position-change=${this._onPositionChangeVolume} @focus=${this._startUsingVolumeContainer} @focusout=${this._stopUsingVolumeContainer}></d2l-seek-bar>
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
								${this._getDownloadBottonView()}
							</d2l-menu>
						</d2l-dropdown-menu>
					</d2l-dropdown>

					${fullscreenButton}

				</div>
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

	requestFullscreen() {
		if (fullscreenApi.isFullscreen) return;

		this._toggleFullscreen();
	}

	exitFullscreen() {
		if (!fullscreenApi.isFullscreen) return;

		this._toggleFullscreen();
	}

	_onVideoContainerMouseMove() {
		this._showControls(true);
	}

	_onEnded() {
		this.dispatchEvent(new CustomEvent('ended'));
	}

	_onError() {
		this._setLoadErrorMessage();
		this.dispatchEvent(new CustomEvent('error'));
	}

	_onLoadedData() {
		this._setLoadSuccessMessage();
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

	_onPlaybackSpeedsMenuItemChange(e) {
		this._media.playbackRate = e.target.value;
		this._playbackSpeedMenuValue = e.target.value;
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

	_onDownloadClick() {
		const link = document.createElement('a');
		link.download = 'download';
		link.target = '_blank';
		link.href = this.src;
		link.click();
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

		if (this._sourceType !== SOURCE_TYPES.video) return;

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
		const settingsMenuOpened = this._settingsMenu && this._settingsMenu.opened;
		return NATIVE_CONTROLS || (this._playing && !this._recentlyShowedCustomControls && !this._hoveringMediaControls && !settingsMenuOpened && !this._usingVolumeContainer && this._sourceType === SOURCE_TYPES.video) || this._sourceType === SOURCE_TYPES.unknown;
	}

	_determineSourceType() {
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

	_getErrorAlertView() {
		return this._message.type === MESSAGE_TYPES.error ? html`
			<d2l-alert type="critical">
				${this._message.text}
			</d2l-alert>
		` : null;
	}

	_getMediaAreaView() {
		const playIcon = `tier3:${this._playing ? 'pause' : 'play'}`;
		const playTooltip = `${this._playing ? this.localize('pause') : this.localize('play')} (${KEY_BINDINGS.play})`;

		switch (this._sourceType) {
			case SOURCE_TYPES.video:
				return html`
					<video ?controls="${NATIVE_CONTROLS}" id="d2l-labs-media-player-video" ?autoplay="${this.autoplay}" ?loop="${this.loop}" poster="${ifDefined(this.poster)}" preload="metadata" @click=${this._onVideoClick} @ended=${this._onEnded} @error=${this._onError} @loadeddata=${this._onLoadedData} @play=${this._onPlay} @pause=${this._onPause} @loadedmetadata=${this._onLoadedMetadata} @timeupdate=${this._onTimeUpdate} @volumechange=${this._onVolumeChange}>
						<source src="${this.src}">
					</video>
				`;
			case SOURCE_TYPES.audio:
				return html`
					<audio id="d2l-labs-media-player-audio" ?controls="${NATIVE_CONTROLS}" ?autoplay="${this.autoplay}" ?loop="${this.loop}" preload="metadata" @ended=${this._onEnded} @error=${this._onError} @loadeddata=${this._onLoadedData} @play=${this._onPlay} @pause=${this._onPause} @loadedmetadata=${this._onLoadedMetadata} @timeupdate=${this._onTimeUpdate} @volumechange=${this._onVolumeChange}>
						<source src="${this.src}"></source>
					</audio>

					<div id="d2l-labs-media-player-audio-bars-container">
						<div id="d2l-labs-media-player-audio-play-button-container">
							<d2l-button id="d2l-labs-media-player-audio-play-button" title="${playTooltip}" aria-label="${playTooltip}" @click=${this._togglePlay}>
								<d2l-icon icon="${playIcon}"></d2l-icon>
							</d2l-button>
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
			<d2l-menu-item text="${this.localize('subtitles')}">
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

	_getDownloadBottonView() {
		const theme = this._sourceType === SOURCE_TYPES.video ? 'dark' : undefined;
		return this.allowDownload ? html`
			<d2l-menu-item text="${this.localize('download')}" theme="${ifDefined(theme)}" @click=${this._onDownloadClick}></d2l-menu-item>
		` : null;
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
}

customElements.define('d2l-labs-media-player', MediaPlayer);
