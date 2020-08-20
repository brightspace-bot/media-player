import '@brightspace-ui/core/components/icons/icon.js';
import '@d2l/seek-bar/d2l-seek-bar.js';
import { css, html, LitElement } from 'lit-element/lit-element.js';

class MediaPlayer extends LitElement {

	static get properties() {
		return {
			src: { type: String },
			playing: { type: Boolean },
			muted: { type: Boolean },
			fullscreen: { type: Boolean },
			speed: { type: Number },
			secondsElapsed: { type: Number },
			secondsDuration: { type: Number },
			hidingControls: { type: Boolean },
			volume: { type: Number },
			speedDialogueOpen: { type: Boolean },
			hoveringVolumeContainer: { type: Boolean },
			hoveringSpeedContainer: { type: Boolean },
		};
	}

	static get styles() {
		return css`
			.container {
				align-items: center;
				display: flex;
				height: 100%;
				justify-content: center;
				width: 100%;
			}

			.video-container {
				border-radius: 4px;
				display: flex;
				flex-direction: column;
				height: 100%;
				justify-content: center;
				margin: 0 auto;
				position: relative;
				width: 100%;
			}

			video {
				border-radius: 4px;
				height: 100%;
				width: 100%;
			}

			#video-controls {
				background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7));
				bottom: 0;
				height: 53px;
				left: 0;
				position: absolute;
				right: 0;
				transition: all 0.2s ease;
			}

			#video-controls > * {
				position: relative;
				top: -9px;
			}

			#seek-bar {
				--d2l-knob-focus-color: #fff;
				--d2l-knob-focus-size: 4px;
				--d2l-knob-size: 15px;
				--d2l-outer-knob-color: var(--d2l-color-celestine-plus-1);
				--d2l-progress-border-radius: 0;
				left: 0;
				position: relative;
				right: 0;
			}

			.control-element {
				border-radius: 4px;
				display: inline-block;
				font-size: 20px;
				margin: 0px 2px;
				padding: 10px 10px;
				position: relative;
			}

			.control-element:hover {
				background: rgba(255, 255, 255, 0.2);
				cursor: pointer;
			}

			#time:hover {
				background: rgba(255, 255, 255, 0);
				cursor: auto;
			}

			button:hover {
				cursor: pointer;
			}

			.control-display {
				color: white;
			}

			button {
				background-color: transparent;
				border: none;
				outline: none;
				padding: 0;
			}

			.left {
				float: left;
				height: 28px;
			}

			.right {
				float: right;
				height: 28px;
			}

			.right > * {
				float: right;
			}

			#volume-button {
				font-size: 20px;
			}

			#volume-level-container {
				bottom: 41px;
				height: 40px;
				left: -19px;
				padding: 0px;
				position: absolute;
				width: 75px;
			}

			#volume-level-background {
				background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7));
				border-radius: 0px 5px 5px 0px;
				height: 38px;
				left: 36px;
				padding: 0px 10px;
				position: relative;
				top: 2px;
				width: 125px;
			}

			#volume-level {
				--d2l-knob-focus-color: #fff;
				--d2l-knob-focus-size: 4px;
				--d2l-knob-size: 18px;
				--d2l-outer-knob-color: var(--d2l-color-celestine-plus-1);
				position: relative;
				top: 12px;
			}

			#volume-button {
				height: 18px;
				position: relative;
			}

			#speed-container {
				height: 0px;
			}

			#speed-container > button {
				font-size: 16px;
			}

			#speed-level-container {
				bottom: 50px;
				height: 15px;
				position: relative;
				top: -50px;
				width: 45px;
			}

			#speed-level-background {
				background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7));
				border-radius: 5px 5px 0px 0px;
				bottom: 14px;
				height: 240px;
				left: -33px;
				position: absolute;
				width: 110px;
			}

			#speed-level-background > button {
				border-bottom: 1px solid rgba(255, 255, 255, 0.2);
				color: white;
				display: block;
				font-size: 16px;
				padding: 7px 30px;
				width: 100%;
			}

			#speed-level-background > button:hover {
				background: rgba(255, 255, 255, 0.3);
			}

			.rotated {
				transform: rotate(-90deg);
			}
		`;
	}

	static formatTime(totalSeconds) {
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

	static get hideDelay() {
		return 2000;
	}

	static get keyBindings() {
		return {
			play: 'k',
			mute: 'm',
			fullscreen: 'f'
		};
	}

	constructor() {
		super();

		this.nativeControls = !document.createElement('video').canPlayType;
		this.timeElapsed = '00:00';
		this.duration = '00:00';
		this.speed = 1;
		this.playing = false;
		this.muted = false;
		this.fullscreen = false;
		this.secondsElapsed = 0;
		this.secondsDuration = 1;
		this.hidingControls = true;
		this.mouseInVideoControls = false;
		this.volume = 1;
		this.speedDialogueOpen = false;
		this.hoveringVolumeContainer = false;
		this.hoveringSpeedContainer = false;

		this.listenForKeyboard = this.listenForKeyboard.bind(this);
	}

	render() {
		return html`
		<div class="container">
			<div class="video-container" id="video-container" @mousemove=${this.showControlsTemporarily}>
				<video ?controls="${this.nativeControls}" class="video" id="video" preload="metadata" @play=${this.onPlay} @pause=${this.onPause} @loadedmetadata=${this.initializeVideo} @timeupdate=${this.updateTimeElapsed} @click=${this.togglePlay} @volumechange=${this.onVolumeChange}>
					<source src="${this.src}">
				</video>

				<div id="video-controls" ?hidden="${this.nativeControls || (this.hidingControls)}" @mouseenter=${this.mouseEnter} @mouseleave=${this.mouseLeave}>
					<d2l-seek-bar fullWidth solid id="seek-bar" value="${Math.floor(this.secondsElapsed / this.secondsDuration * 100)}" aria-label="SeekBar" aria-valuenow="${Math.floor(this.secondsElapsed / this.secondsDuration * 100)}" @drag-end=${this.onDragEndSeek} @position-change=${this.onPositionChangeSeek}></d2l-seek-bar>
					<div class="left">
						<button class="control-element" title="${this.getPlayTooltip()}" @click=${this.togglePlay}>
							<d2l-icon class="control-display" icon="${this.getPlayIcon()}"></d2l-icon>
						</button>

						<div class="volume-container control-element" @mouseenter=${this.startHoveringVolumeContainer} @mouseleave=${this.stopHoveringVolumeContainer} @click=${this.toggleMute}>
							<button id="volume-button" title="${this.getMuteTooltip()}">
								<d2l-icon class="control-display" icon="d2l-tier1:volume"></d2l-icon>
							</button>

							<div class="rotated" id="volume-level-container" ?hidden="${!this.hoveringVolumeContainer}">
								<div id="volume-level-background">
									<d2l-seek-bar solid id="volume-level" vertical="" value="${this.volume * 100}" @drag-end=${this.onDragEndVolume} @position-change=${this.onPositionChangeVolume}></d2l-seek-bar>
								</div>
							</div>
						</div>

						<div class="control-element control-display" id="time">
							${MediaPlayer.formatTime(this.secondsElapsed)} / ${MediaPlayer.formatTime(this.secondsDuration)}
						</div>
					</div>
					<div class="right">
						<button class="control-element" title="${this.getFullscreenTooltip()}" @click=${this.toggleFullscreen}>
							<d2l-icon class="control-display" icon="${this.getFullscreenIcon()}"></d2l-icon>
						</button>

						<div id="speed-container" @mouseenter=${this.startHoveringSpeedContainer} @mouseleave=${this.stopHoveringSpeedContainer}>
							<button class="control-element control-display">
								${this.speed}x
							</button>

							<div id="speed-level-container">
								<div id="speed-level-background" ?hidden="${!this.hoveringSpeedContainer}">
									<button value="0.25" @click=${this.updatePlaybackRate}>0.25</button>
									<button value="0.5" @click=${this.updatePlaybackRate}>0.5</button>
									<button value="0.75" @click=${this.updatePlaybackRate}>0.75</button>
									<button value="1" @click=${this.updatePlaybackRate}>Normal</button>
									<button value="1.25" @click=${this.updatePlaybackRate}>1.25</button>
									<button value="1.5" @click=${this.updatePlaybackRate}>1.5</button>
									<button value="2" @click=${this.updatePlaybackRate}>2</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		`;
	}

	firstUpdated() {
		super.firstUpdated();

		this.video = this.shadowRoot.getElementById('video');
		this.seekBar = this.shadowRoot.getElementById('seek-bar');
		this.volumeLevel = this.shadowRoot.getElementById('volume-level');
		this.videoContainer = this.shadowRoot.getElementById('video-container');

		document.addEventListener('keydown', this.listenForKeyboard);

		this.showControlsTemporarily();
	}

	getFullscreenIcon() {
		return this.fullscreen ? 'd2l-tier1:smallscreen' : 'd2l-tier1:fullscreen';
	}

	getPlayIcon() {
		return this.playing ? 'd2l-tier1:pause' : 'd2l-tier1:play';
	}

	getPlayTooltip() {
		return `${this.playing ? 'Pause' : 'Play'} (${MediaPlayer.keyBindings.play})`;
	}

	getFullscreenTooltip() {
		return `${this.fullscreen ? 'Exit fullscreen' : 'Fullscreen'} (${MediaPlayer.keyBindings.fullscreen})`;
	}

	getMuteTooltip() {
		return `${this.muted ? 'Unmute' : 'Mute'} (${MediaPlayer.keyBindings.mute})`;
	}

	onDragEndSeek() {
		if (this.seekBar) { // onDragEndSeek() is called once before firstUpdated()
			this.updateCurrentTimeOfVideo(this.seekBar.immediateValue / 100);
		}
	}

	onPositionChangeSeek() {
		this.updateCurrentTimeOfVideo(this.seekBar.immediateValue / 100);
		this.showControlsTemporarily();
	}

	updateCurrentTimeOfVideo(fraction) {
		this.video.currentTime = Math.floor(fraction * this.secondsDuration);
	}

	onDragEndVolume() { // onDragEndVolume() is called once before firstUpdated()
		if (this.volumeLevel) {
			this.video.volume = this.volumeLevel.immediateValue / 100;
		}
	}

	onPositionChangeVolume() {
		this.video.volume = this.volumeLevel.immediateValue / 100;
	}

	onVolumeChange() {
		this.volume = this.video.volume;
	}

	onPlay() {
		this.playing = true;
	}

	onPause() {
		this.playing = false;
	}

	togglePlay() {
		if (this.video.paused) {
			this.video.play();
		} else {
			this.video.pause();
		}
	}

	toggleMute() {
		if (this.muted) {
			this.video.volume = this.preMuteVolume;
		} else {
			this.preMuteVolume = this.video.volume;
			this.video.volume = 0;
		}

		this.muted = !this.muted;
	}

	toggleFullscreen() {
		if (document.fullscreenElement) {
			document.exitFullscreen();
			this.fullscreen = false;
		} else {
			this.videoContainer.requestFullscreen();
			this.fullscreen = true;
		}
	}

	initializeVideo() {
		this.secondsDuration = Math.floor(this.video.duration);
	}

	updateTimeElapsed() {
		this.secondsElapsed = Math.floor(this.video.currentTime);
	}

	listenForKeyboard(e) {
		switch (e.key) {
			case MediaPlayer.keyBindings.play:
				this.togglePlay();
				this.showControlsTemporarily();
				break;
			case MediaPlayer.keyBindings.mute:
				this.toggleMute();
				this.showControlsTemporarily();
				break;
			case MediaPlayer.keyBindings.fullscreen:
				this.toggleFullscreen();
				this.showControlsTemporarily();
				break;
		}
	}

	mouseEnter() {
		this.mouseInVideoControls = true;
		this.showControls();
	}

	mouseLeave() {
		this.mouseInVideoControls = false;
		this.showControlsTemporarily();
	}

	showControls() {
		this.hidingControls = false;
		this.lastTimeEntered = Date.now();
		this.videoContainer.style.cursor = 'auto';
	}

	showControlsTemporarily() {
		this.showControls();

		setTimeout(() => {
			if (Date.now() - this.lastTimeEntered >= MediaPlayer.hideDelay && !this.mouseInVideoControls && this.playing) {
				this.hidingControls = true;
				this.videoContainer.style.cursor = 'none';
			}
		}, MediaPlayer.hideDelay);
	}

	updatePlaybackRate(e) {
		const rate = e.target.value;
		this.speed = rate;
		this.video.playbackRate = rate;
		this.hoveringSpeedContainer = false;
	}

	startHoveringSpeedContainer() {
		this.hoveringSpeedContainer = true;
	}

	stopHoveringSpeedContainer() {
		this.hoveringSpeedContainer = false;
	}

	startHoveringVolumeContainer() {
		this.hoveringVolumeContainer = true;
	}

	stopHoveringVolumeContainer() {
		this.hoveringVolumeContainer = false;
	}
}

customElements.define('d2l-media-player', MediaPlayer);
