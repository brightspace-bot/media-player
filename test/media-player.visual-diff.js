const puppeteer = require('puppeteer');
const VisualDiff = require('@brightspace-ui/visual-diff');

describe('d2l-labs-media-player', () => {

	const visualDiff = new VisualDiff('d2l-labs-media-player', __dirname);

	let browser, page;

	before(async() => {
		browser = await puppeteer.launch();
		page = await visualDiff.createPage(browser);
		await page.goto(`${visualDiff.getBaseUrl()}/test/media-player.visual-diff.html`, {waitUntil: ['networkidle0', 'load']});
		await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 2 });
		await page.bringToFront();
	});

	beforeEach(async() => {
		await visualDiff.resetFocus(page);
	});

	after(async() => await browser.close());

	it('should load', async function() {
		const rect = await visualDiff.getRect(page, 'html');
		await visualDiff.screenshotAndCompare(page, this.test.fullTitle(), { clip: rect });
	});
});
