import { dedupingMixin } from '@polymer/polymer/lib/utils/mixin.js';
import { LocalizeMixin } from '@brightspace-ui/core/mixins/localize-mixin.js';

const internalLocalizeMixin = superClass => class extends LocalizeMixin(superClass) {
	static async getLocalizeResources(langs) {
		for (const lang of langs) {
			let translations;

			switch (lang) {
				case 'ar':
					translations = await import('../../locales/js/ar.js');
					break;
				case 'da-dk':
					translations = await import('../../locales/js/da-dk.js');
					break;
				case 'de':
					translations = await import('../../locales/js/de.js');
					break;
				case 'en':
					translations = await import('../../locales/js/en.js');
					break;
				case 'es':
					translations = await import('../../locales/js/es.js');
					break;
				case 'fi':
					translations = await import('../../locales/js/fi.js');
					break;
				case 'fr':
					translations = await import('../../locales/js/fr.js');
					break;
				case 'fr-fr':
					translations = await import('../../locales/js/fr-fr.js');
					break;
				case 'ja':
					translations = await import('../../locales/js/ja.js');
					break;
				case 'ko':
					translations = await import('../../locales/js/ko.js');
					break;
				case 'nl':
					translations = await import('../../locales/js/nl.js');
					break;
				case 'pt':
					translations = await import('../../locales/js/pt.js');
					break;
				case 'sv':
					translations = await import('../../locales/js/sv.js');
					break;
				case 'tr':
					translations = await import('../../locales/js/tr.js');
					break;
				case 'zh-tw':
					translations = await import('../../locales/js/zh-tw.js');
					break;
				case 'zh':
					translations = await import('../../locales/js/zh.js');
					break;
				default:
					continue;
			}

			if (translations && translations.val) {
				return {
					language: lang,
					resources: translations.val
				};
			}
		}

		return null;
	}
};

export const InternalLocalizeMixin = dedupingMixin(internalLocalizeMixin);
