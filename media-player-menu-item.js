import '@brightspace-ui/core/components/icons/icon.js';
import { css, html, LitElement } from 'lit-element/lit-element.js';
import { MenuItemMixin } from '@brightspace-ui/core/components/menu/menu-item-mixin.js';
import { menuItemStyles } from '@brightspace-ui/core/components/menu/menu-item-styles.js';

class MediaPlayerMenuItem extends MenuItemMixin(LitElement) {
	static get properties() {
		return {
			subMenu: { type: Boolean },
			text: { type: String },
			value: { type: String }
		};
	}

	static get styles() {
		return [
			menuItemStyles,
			css`
				.d2l-labs-media-player-menu-item-flex-row {
					display: flex;
					flex-direction: row;
					height: 2rem;
					position: relative;
					top: 0;
				}

				.d2l-labs-media-player-menu-item-flex-column {
					display: flex;
					flex-direction: column;
					justify-content: center;
					padding: 0 0.125rem;
				}

				span {
					font-size: 1rem;
				}

				.d2l-labs-media-player-menu-item-flex-filler {
					flex: auto;
				}
			`
		];
	}

	render() {
		const icon = this.subMenu ? html`<d2l-icon icon="tier1:chevron-right"></d2l-icon>` : null;

		return html`
			<div class="d2l-labs-media-player-menu-item-flex-row">
				<div class="d2l-labs-media-player-menu-item-flex-column">
					<b>${this.text}</b>
				</div>
				<div class="d2l-labs-media-player-menu-item-flex-filler"></div>
				<div class="d2l-labs-media-player-menu-item-flex-column">
					${this.value}
				</div>
				<div class="d2l-labs-media-player-menu-item-flex-column">
					${icon}
				</div>
				<slot></slot>
			</div>
		`;
	}
}

customElements.define('d2l-labs-media-player-menu-item', MediaPlayerMenuItem);
