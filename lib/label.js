const { MalformedTemplateError } = require("./error.js");
const { MenuItem } = require("./item.js");
const { Utils } = require("./utils.js");
const { Submenu } = require("./submenu.js");

class MenuLabel {
  constructor(element) {
    this.element = element;
    this.menuBox = null;
    this.labelText = undefined;
    this.submenu = new Submenu();
    this.open = false;
    this.focused = false;
    this.altTrigger = undefined;
    this.parent = undefined;

    this.element.addEventListener("click", (e) => this.onMouseClick(e));
    this.element.addEventListener("mouseenter", (e) => this.onMouseEnter(e));
  }

  static createMenuLabel(labelItem) {
    if (labelItem.label === undefined || !labelItem.submenu) {
      throw new MalformedTemplateError("Label template is malformed!");
    }

    const labelEl = document.createElement("span");
    labelEl.classList.add("menu-label");
    const labelData = Utils.formatAltKey(labelItem.label);
    labelEl.setAttribute("label", labelData.name);
    labelEl.setAttribute("alt-trigger", labelData.key);
    labelEl.innerHTML = labelData.html;

    const self = new MenuLabel(labelEl);
    self.labelText = labelItem.label;
    self.altTrigger = labelData.key || undefined;

    const submenuEl = document.createElement("div");
    submenuEl.classList.add("menu-box");
    labelEl.appendChild(submenuEl);
    self.menuBox = submenuEl;

    labelItem.submenu.forEach((o) => {
      try {
        self.addChild(MenuItem.createMenuItem(o));
      } catch (e) {
        console.error(e);
      }
    });

    return self;
  }

  serialize() {
    return {
      label: this.labelText,
      submenu: this.submenu.map((o) => {
        return o.serialize();
      }),
    };
  }

  onMouseClick(e) {
    e.stopPropagation();
    this.parent?.onLabelClicked?.(this, e);
  }

  onMouseEnter(e) {
    e.stopPropagation();
    this.parent?.onLabelMouseEnter?.(this, e);
  }

  onChildClick(target, e) {}

  onChildMouseEnter(target, e) {
    this.submenu.forEach((o) => {
      o.setOpen(false);
      o.setSelected(false);
    });
    if (target.isEnabled()) {
      target.setSelected(true);
      if (target.hasSubmenu()) {
        target.setOpen(true);
      }
    }
  }

  getElement() {
    return this.element;
  }

  getLabelText() {
    return this.labelText;
  }

  getSubmenu() {
    return this.submenu;
  }

  isOpen() {
    return this.open;
  }

  isFocused() {
    return this.focused;
  }

  getAltTrigger() {
    return this.altTrigger;
  }

  getParent() {
    return this.parent;
  }

  setOpen(flag) {
    this.open = flag;
    if (flag) {
      this.setFocused(false);
    }
    this.submenu.forEach((o) => {
      o.setOpen(false);
      if (!flag) o.setSelected(false);
    });
    Utils.setToggleClass(this.element, "open", flag);
  }

  setFocused(flag) {
    this.focused = flag;
    Utils.setToggleClass(this.element, "focused", flag);
  }

  setParent(parent) {
    this.parent = parent;
  }

  addChild(item) {
    item.setParent(this);
    this.submenu.push(item);
    this.menuBox?.appendChild(item.getElement());
  }

  insertChild(item, index) {
    item.setParent(this);
    this.submenu?.splice(index, 0, item);
    this.menuBox?.insertBefore(
      item.getElement(),
      this.menuBox.children[index] || null
    );
  }

  removeChild(x) {
    if (x instanceof MenuItem) {
      this.submenu?.splice(this.submenu?.indexOf(x), 1);
      x.getElement().parentElement?.removeChild(x.getElement());
      return;
    }

    const item = this.submenu?.splice(x, 1)[0];
    item?.getElement().parentElement?.removeChild(item?.getElement());
  }
}

module.exports = { MenuLabel };
