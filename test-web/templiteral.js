export const valuePattern = /---!{.*?(}!---)/gi;
export const propPattern = /^\[.*\]$/;
export const matchPattern = /---!{\d+}!---/gi;
export const valueToInt = match => +match.replace(/(---!{)|(}!---)/gi, '');
export const toEventName = string => string.replace('@', '');

export function html(strings, ...values)  {
  return new Template(strings, values);
}

export class ContentNode {
  constructor(node, compiler) {
    this.node = node;
    this.compiler = compiler;
    this.base = node.nodeValue || '';
    this.indicies = this.base
      .match(valuePattern)
      .map(valueToInt);
    
    this.indicies.forEach(index => this.compiler.partIndicies.set(index, this));
  }

  init(context) {
    this.context = context;
  }

  update(values) {
    this.node.nodeValue = this.base.replace(matchPattern, match => {
      const value = values[valueToInt(match)];
      return value === null ? '' : value;
    });
  }
}

export class AttributeNode {
  constructor(node, boundAttributes, compiler) {
    this.node = node;
    this.boundAttributes = boundAttributes;
    this.compiler = compiler;
    this.eventMap = new Map();

    boundAttributes.forEach(attribute => {
      attribute.base = attribute.value;
      attribute.bases = attribute.base.match(matchPattern) || [];
      attribute.baseIndicies = attribute.bases.map(valueToInt);
      attribute.cleanName  = attribute.name.replace(/\[|\]/g, '') ;
      const indicies = attribute.base.match(valuePattern) || [];
      this.indicies = indicies.map(valueToInt);
      this.indicies.forEach(index => this.compiler.partIndicies.set(index, this));
    });
  }

  addListener(eventName, callback) {
    this.node.addEventListener(eventName, callback.bind(this.context));
    this.node.removeAttribute(`@${eventName}`);
  }

  init(context) {
    this.context = context;
  }

  update(values) {
    this.boundAttributes.forEach(attribute => {
      let attributeValue = attribute.base;

      for (let i = 0; i < attribute.baseIndicies.length; i += 1) {
        const index = attribute.baseIndicies[i];
        const value = values[index] || '';
          if (typeof value !== 'function') {
            attributeValue = attributeValue.replace(`---!{${index}}!---`, value);
          } else {
            this.addListener(toEventName(attribute.name), value);
            this.boundAttributes.delete(attribute.name);
          }
        }
    });
  }
}

export class Template {
  constructor(strings, values) {
    this.strings = strings;
    this.values = values;
    this.partIndicies = new Map();
  }

  render(context, location) {
    const html = this._initHTML(this.strings, this.values);
    const template = this._configureTemplate(html);
    const instance = this._createInstance(template);
    const parts = this._walkInstance(instance);

    this.parts = parts;

    if (!location) {
      location = context;
    }
    const { templateResult } = this;
    const { shadowRoot } = location;
    this.context = context;
    this.parts.forEach(part => {
      part.init(context);
      part.update(this.values)
    });
    if (shadowRoot) {
      shadowRoot.appendChild(templateResult);
    } else {
      context.appendChild(templateResult);
    }
  }

  update(values) {
    this.oldValues = this.values;
    this.values = values;
    this.parts.forEach(part => part.update(this.values))
  }

  _configureTemplate(html) {
    if (!this._template) {
      const template = document.createElement('template');
      template.innerHTML = html;
      this._template = template
    }
    return this._template;
  }

  _createInstance(template) {
    if (!this._instance) {
      const instance = document.importNode(template.content, true);
      this._instance = instance;
    }
    return this._instance;
  }

  _initHTML(strings, values) {
    if (!this.baseHTML) {
      const baseHTML = strings.map((string, index) => {
        const value = values[index];
        const interpolatedValue = `---!{${index}}!---`;
  
        let output = '';
  
        output += string ? string : '';
  
        if (value !== undefined) {
          output += interpolatedValue;
        } else {
          output += `<!-- ${interpolatedValue} -->`;
        }

        return output;
      }).join('');
      this.baseHTML = baseHTML;
    }
    return this.baseHTML;
  }

  _walkInstance(instance) {
    const walker = document.createTreeWalker(instance, 133, null, false);
    const parts = [];

    while (walker.nextNode()) {
      const { currentNode } = walker;
      switch(currentNode.nodeType) {
        case 1: {
          const { attributes } = currentNode;
          const boundAttrs = new Map();

          if (attributes.length) {
            Array.from(attributes).forEach(attribute => {
              if (attribute.value.match(valuePattern) || attribute.name.match(propPattern)) {
                boundAttrs.set(attribute.name, attribute);
              }
            });
            if (boundAttrs.size >= 1) {
              const attrNode = new AttributeNode(currentNode, boundAttrs, this);
              parts.push(attrNode);
            }
          }
          break;
        }
        case 3: {
          if (currentNode.textContent && currentNode.textContent.match(valuePattern)) {
            const contentNode = new ContentNode(currentNode, this);
            parts.push(contentNode);
            contentNode.update(this.values, this.oldValues);
          }
          break;
        }
      }
    }
    this.templateResult = instance;
    return parts;
  }
}
