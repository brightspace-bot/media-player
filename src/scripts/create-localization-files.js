/* global require */

const requireDir = require('require-dir');
const fs = require('fs');
const path = require('path');

const jsDirectory = path.resolve('locales', 'js');
const jsonDirectory = path.resolve('locales', 'json');

function createLocalizationJSFiles() {
	const jsonLocales = requireDir(jsonDirectory);

	Object.keys(jsonLocales).forEach((lang) => {
		const pathToNewFile = path.join(jsDirectory, `${lang}.js`);

		const key = 'Val';

		const fd = fs.openSync(pathToNewFile, 'w');

		fs.writeSync(fd, `const ${key} = {};\n`);

		Object.keys(jsonLocales[lang]).forEach((code) => {
			let value = jsonLocales[lang][code];
			// Stringified value (wrapped in double-quotes)
			value = JSON.stringify(value);
			// Remove escaping of "s
			value = value.replace('\\"', '"');
			// Escape 's
			value = value.replace("'", "\\'");
			// Wrap value in single-quotes
			value = `'${value.substr(1, value.length - 2)}'`;

			fs.writeSync(fd, `${key}['${code}'] = ${value};\n`);
		});

		fs.writeSync(fd, `\nexport const val = ${key};\n`);
	});
}

function clearLocalizationJSDirectory() {
	const jsFiles = fs.readdirSync(jsDirectory);

	jsFiles.forEach((file) => {
		const pathToFile = path.join(jsDirectory, file);
		fs.unlinkSync(pathToFile);
	});
}

function run() {
	clearLocalizationJSDirectory();
	createLocalizationJSFiles();
}

run();
