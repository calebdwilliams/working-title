import { html } from './templiteral.js';

// Start component
const renderSymbol= Symbol();

class Component extends HTMLElement {
  static get observedAttributes() { return this.boundAttributes.map(attribute => attribute.name); }
  static get boundAttributes() { return []; }

  constructor() {
    super();

    this.constructor.boundAttributes.forEach(attribute => {
      const { name, type } = attribute;
      Object.defineProperty(this, name, {
        get() {
          const value = this.getAttribute(name);
          if (type) {
            return type(value)
          }
          return value;
        },
        set(value) {
          if (value) {
            this.setAttribute(name, value);
          } else {
            this.removeAttribute(name);
          }
          if (this[renderSymbol]) {
            const { values } = this.render();
            console.log(values, 'xyz');
            this[renderSymbol].update(values);
          }
        }
      });
    });
  }

  connectedCallback() {
    const renderer = this.render();
    renderer.render(this);
    this[renderSymbol] = renderer;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    
  }
}

class TestEl extends Component {
  static get boundAttributes() { 
    return [
      {
        name: 'whatever',
        type: String
      }
    ]; 
  }
  
  constructor() {
    super();
    this.whatever = 'world';
  }

  changeWhatever(event) {
    if (this.whatever === 'world') {
      this.whatever = 'y\'all';
    } else {
      this.whatever = 'world';
    }
  }

  render() {
    console.log(this)
    return html`<h1>Hello ${this.whatever}</h1>
    <button @click="${this.changeWhatever}">Change whatever</button>`;
  }
}

customElements.define('test-el', TestEl);
