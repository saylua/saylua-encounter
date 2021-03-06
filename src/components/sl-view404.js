import {html, LitElement} from 'lit-element';
import {SharedStyles} from './shared-styles';

/**
 * 404 page component.
 */
class SlView404 extends LitElement {
  /** @override */
  static get styles() {
    return [
      SharedStyles,
    ];
  }

  /** @override */
  render() {
    return html`
      <section>
        <h2>Oops! You hit a 404</h2>
        <p>
          The page you're looking for doesn't seem to exist. Head back
          <a href="/">home</a> and try again?
        </p>
      </section>
    `;
  }
}

window.customElements.define('sl-view404', SlView404);
