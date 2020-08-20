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
			html {
				height: 100%;
			}

			body {
				height: 100%;
			}

			.container {
				width: 100%;
				height: 100%;
				display: flex;
				justify-content: center;
				align-items: center;
			}

			.video-container {
				width: 100%;
				height: 100%;
				border-radius: 4px;
				margin: 0 auto;
				position: relative;
				display: flex;
				flex-direction: column;
				justify-content: center;
			}

			video {
				width: 100%;
				height: 100%;
				border-radius: 4px;
			}

			#video-controls {
				right: 0;
				left: 0;
				position: absolute;
				bottom: 0;
				transition: all 0.2s ease;
				background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7));
				height: 53px;
			}

			#video-controls > * {
				top: -9px;
				position: relative;
			}

			#seek-bar {
				--d2l-knob-size: 15px;
				--d2l-outer-knob-color: var(--d2l-color-celestine-plus-1);
				--d2l-knob-focus-color: #fff;
				--d2l-knob-focus-size: 4px;
				--d2l-progress-border-radius: 0;
				position: relative;
				left: 0;
				right: 0;
			}

			.control-element {
				display: inline-block;
				padding: 10px 10px;
				margin: 0px 2px;
				font-size: 20px;
				position: relative;
				border-radius: 4px;
			}

			.control-element:hover {
				cursor: pointer;
				background: rgba(255, 255, 255, 0.2);
			}

			#time:hover {
				cursor: auto;
				background: rgba(255, 255, 255, 0);
			}

			button:hover {
				cursor: pointer;
			}

			.control-display {
				color: white;
			}

			button {
				background-color: transparent;
				outline: none;
				border: none;
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
				padding: 0px;
				position: absolute;
				left: -19px;
				bottom: 41px;
				width: 75px;
				height: 40px;
			}

			#volume-level-background {
				width: 125px;
				height: 38px;
				background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7));
				border-radius: 0px 5px 5px 0px;
				position: relative;
				left: 36px;
				top: 2px;
				padding: 0px 10px;
			}

			#volume-level {
				position: relative;
				top: 12px;
				--d2l-knob-size: 18px;
				--d2l-outer-knob-color: var(--d2l-color-celestine-plus-1);
				--d2l-knob-focus-color: #fff;
				--d2l-knob-focus-size: 4px;
			}

			#volume-button {
				position: relative;
				height: 18px;
			}

			#speed-container {
				height: 0px;
			}

			#speed-container > button {
				font-size: 16px;
			}

			#speed-level-container {
				width: 45px;
				height: 15px;
				bottom: 50px;
				position: relative;
				top: -50px;
			}

			#speed-level-background {
				border-radius: 5px 5px 0px 0px;
				position: absolute;
				background-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7));
				width: 110px;
				height: 240px;
				left: -33px;
				bottom: 14px;
			}

			#speed-level-background > button {
				display: block;
				color: white;
				border-bottom: 1px solid rgba(255, 255, 255, 0.2);
				width: 100%;
				font-size: 16px;
				padding: 7px 30px;
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
