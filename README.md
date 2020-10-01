# media-player

[![NPM version](https://img.shields.io/npm/v/@brightspace-ui-labs/media-player.svg)](https://www.npmjs.org/package/@brightspace-ui-labs/media-player)
[![Dependabot badge](https://flat.badgen.net/dependabot/BrightspaceUILabs/media-player?icon=dependabot)](https://app.dependabot.com/)
[![Build status](https://travis-ci.com/@brightspace-ui-labs/media-player.svg?branch=master)](https://travis-ci.com/@brightspace-ui-labs/media-player)

> Note: this is a ["labs" component](https://github.com/BrightspaceUI/guide/wiki/Component-Tiers). While functional, these tasks are prerequisites to promotion to BrightspaceUI "official" status:
>
> - [ ] [Design organization buy-in](https://github.com/BrightspaceUI/guide/wiki/Before-you-build#working-with-design)
> - [ ] [design.d2l entry](http://design.d2l/)
> - [ ] [Architectural sign-off](https://github.com/BrightspaceUI/guide/wiki/Before-you-build#web-component-architecture)
> - [x] [Continuous integration](https://github.com/BrightspaceUI/guide/wiki/Testing#testing-continuously-with-travis-ci)
> - [x] [Cross-browser testing](https://github.com/BrightspaceUI/guide/wiki/Testing#cross-browser-testing-with-sauce-labs)
> - [x] [Unit tests](https://github.com/BrightspaceUI/guide/wiki/Testing#testing-with-polymer-test) (if applicable)
> - [x] [Accessibility tests](https://github.com/BrightspaceUI/guide/wiki/Testing#automated-accessibility-testing-with-axe)
> - [x] [Visual diff tests](https://github.com/BrightspaceUI/visual-diff)
> - [x] [Localization](https://github.com/BrightspaceUI/guide/wiki/Localization) with Serge (if applicable)
> - [x] Demo page
> - [x] README documentation

A LitElement based media player component, designed for similarity across browsers. Capable of playing video and audio content.

> Displaying video
![Example of video](demo/example-video.png)

> Displaying audio
![Example of audio](demo/example-audio.png)

## Installation

To install from NPM:

```shell
npm install @brightspace-ui-labs/media-player
```

## Usage

```html
<script type="module">
    import '@brightspace-ui-labs/media-player/media-player.js';
</script>
<d2l-labs-media-player src="<URL of media source>"></d2l-labs-media-player>
```

**Properties:**

| Property | Type | Default | Description |
|--|--|--|--|
| autoplay | Boolean | false | If set, will play the media as soon as it has been loaded. |
| loop | Boolean | false | If set, once the media has finished playing it will replay from the beginning. |
| poster | String | null | URL of the image to display in place of the media before it has loaded. |
| src | String, required |  | URL of the media to play. |

```
<!-- Render a media player with a source file and loop the media when it reaches the end -->

<d2l-labs-media-player loop src="./local-video.mp4"></d2l-labs-media-player>
```

**Attributes:**

| Attribute | Type | Get/Set | Description |
|--|--|--|--|
| currentTime | Number | Get & Set | Current time playback time of the media in seconds. |
| duration | Number | Get | Total duration of the media in seconds. |

```
// Programatically determine the current playback time of the media player

console.log(`Current playback time of the media player = ${this.document.querySelector('d2l-labs-media-player').currentTime} sec`);
```

**Methods:**

| Method | Description |
|--|--|
| play() | Begins playing the media. Ignored if the media is already playing.
| pause() | Pauses the media. Ignored if the media is already paused.

```
// Programatically pause the media player

this.document.querySelector('d2l-labs-media-player').pause();
```

**Events:**

| Event | Description |
|--|--|
| ended | Dispatched when the media has reached the end of its duration. |
| loadeddata | Dispatched when the media at the current playback position has finished loading. Often the first frame. |
| loadedmetadata | Dispatched when the metadata for the media has finished loading. |
| play | Dispatched when the media begins playing. |
| pause | Dispatched when the media is paused. |
| timeupdate | Dispatched when the currentTime of the media player has been updated. |

```
// Listen for the loadeddata event

this.document.querySelector('d2l-labs-media-player').addEventListener('loadeddata', () => {
	console.log('loadeddata event has been dispatched');
});
```

## Developing, Testing and Contributing

After cloning the repo, run `npm install` to install dependencies.

### Running the demos

To start an [es-dev-server](https://open-wc.org/developing/es-dev-server.html) that hosts the demo page and tests:

```shell
npm start
```

### Linting

```shell
# eslint and lit-analyzer
npm run lint

# eslint only
npm run lint:eslint

# lit-analyzer only
npm run lint:lit
```

### Testing

```shell
# lint, unit test and visual-diff test
npm test

# lint only
npm run lint

# unit tests only
npm run test:headless

# debug or run a subset of local unit tests
# then navigate to `http://localhost:9876/debug.html`
npm run test:headless:watch
```

### Visual Diff Testing

This repo uses the [@brightspace-ui/visual-diff utility](https://github.com/BrightspaceUI/visual-diff/) to compare current snapshots against a set of golden snapshots stored in source control.

```shell
# run visual-diff tests
npm run test:diff

# subset of visual-diff tests:
npm run test:diff -- -g some-pattern

# update visual-diff goldens
npm run test:diff:golden
```

Golden snapshots in source control must be updated by Travis CI. To trigger an update, press the "Regenerate Goldens" button in the pull request `visual-difference` test run.

## Versioning, Releasing & Deploying

All version changes should obey [semantic versioning](https://semver.org/) rules.

Include either `[increment major]`, `[increment minor]` or `[increment patch]` in your merge commit message to automatically increment the `package.json` version and create a tag.
