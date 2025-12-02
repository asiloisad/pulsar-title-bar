const { shell } = require("electron");
const { MalformedTemplateError } = require("./error.js");
const { exceptionCommands } = require("./types.js");
const { Utils } = require("./utils.js");
const { Submenu } = require("./submenu.js");

class MenuItem {
  constructor(element) {
    this.element = element;
    this.menuBox = null;
    this.labelText = undefined;
    this.separator = false;
    this.enabled = true;
    this.visible = true;
    this.selected = false;
    this.open = false;
    this.command = undefined;
    this.commandDetail = undefined;
    this.altTrigger = undefined;
    this.submenu = undefined;
    this.parent = undefined;

    this.element.addEventListener("click", (e) => this.onMouseClick(e));
    this.element.addEventListener("mouseenter", (e) => this.onMouseEnter(e));
  }

  static createMenuItem(menuItem) {
    if (menuItem.type == "separator") {
      const self = new MenuItem(document.createElement("hr"));
      self.separator = true;
      return self;
    }
    if (menuItem.label === undefined) {
      throw new MalformedTemplateError("Menu item template is malformed!");
    }

    const itemEl = document.createElement("div");
    itemEl.classList.add("menu-item");
    const self = new MenuItem(itemEl);

    if (menuItem.enabled === false) {
      self.enabled = false;
      itemEl.classList.add("disabled");
    }

    if (menuItem.visible === false) {
      self.visible = false;
      itemEl.classList.add("invisible");
    }

    const altKeyData = Utils.formatAltKey(menuItem.label);
    itemEl.setAttribute("alt-trigger", altKeyData.key);
    self.altTrigger = altKeyData.key || undefined;

    // Exception for the VERSION item
    if (menuItem.label === "VERSION") {
      altKeyData.html = "Version " + atom.getVersion();
    }

    const menuItemName = document.createElement("span");
    menuItemName.classList.add("menu-item-name");
    menuItemName.innerHTML = altKeyData.html;
    self.labelText = menuItem.label;

    const menuItemKeystroke = document.createElement("span");
    menuItemKeystroke.classList.add("menu-item-keystroke");

    itemEl.appendChild(menuItemName);
    itemEl.appendChild(menuItemKeystroke);

    if (menuItem.command !== undefined) {
      self.command = menuItem.command;
      self.commandDetail = menuItem.commandDetail;

      const keyStrokes = atom.keymaps.findKeyBindings({
        command: menuItem.command,
      });
      if (keyStrokes.length > 0) {
        menuItemKeystroke.innerHTML = Utils.formatKeystroke(
          keyStrokes[keyStrokes.length - 1].keystrokes
        );
      }
    }

    if (menuItem.submenu?.length > 0) {
      menuItem.submenu.forEach((o) => {
        try {
          self.addChild(MenuItem.createMenuItem(o));
        } catch (e) {
          console.error(e);
        }
      });
    }

    return self;
  }

  serialize() {
    return {
      label: this.labelText,
      command: this.command,
      commandDetail: this.commandDetail,
      submenu: this.submenu?.map((o) => {
        return o.serialize();
      }),
    };
  }

  onMouseClick(e) {
    e.stopPropagation();
    this.parent?.onChildClick?.(this, e);
    if (this.isExecutable()) {
      this.execCommand();
      this.getAppMenuRoot()?.close();
    }
  }

  onMouseEnter(e) {
    e.stopPropagation();
    this.parent?.onChildMouseEnter?.(this, e);
  }

  onChildMouseEnter(target, e) {
    this.submenu?.forEach((o) => {
      o.setOpen(false);
      o.setSelected(false);
    });
    target.setSelected(true);
    target.setOpen(true);
  }

  async execCommand() {
    if (this.command === undefined) {
      return;
    }

    if (exceptionCommands.has(this.command)) {
      switch (this.command) {
        case "application:open-terms-of-use":
          shell.openExternal(
            "https://help.github.com/articles/github-terms-of-service/"
          );
          break;
        case "application:open-documentation":
          shell.openExternal("http://flight-manual.atom.io/");
          break;
        case "application:open-faq":
          shell.openExternal("https://atom.io/faq");
          break;
        case "application:open-discussions":
          shell.openExternal("https://discuss.atom.io/");
          break;
        case "application:report-issue":
          shell.openExternal(
            "https://github.com/atom/atom/blob/master/CONTRIBUTING.md#submitting-issues"
          );
          break;
        case "application:search-issues":
          shell.openExternal("https://github.com/atom/atom/issues");
          break;
      }
      return;
    }

    let target =
      atom.workspace.getActiveTextEditor()?.getElement() ||
      atom.workspace.getActivePane().getElement();

    await atom.commands.dispatch(target, this.command, this.commandDetail);
  }

  addChild(item) {
    if (!this.hasSubmenu()) {
      this.submenu = new Submenu();
      this.element.classList.add("has-sub");

      this.menuBox = document.createElement("div");
      this.menuBox.classList.add("menu-box", "menu-item-submenu");
      this.element.appendChild(this.menuBox);
    }

    item.setParent(this);
    this.submenu?.push(item);
    this.menuBox?.appendChild(item.getElement());
  }

  insertChild(item, index) {
    if (!this.hasSubmenu()) {
      this.submenu = new Submenu();
      this.element.classList.add("has-sub");

      this.menuBox = document.createElement("div");
      this.menuBox.classList.add("menu-box", "menu-item-submenu");
      this.element.appendChild(this.menuBox);
    }

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

  getAppMenuRoot() {
    const { ApplicationMenu } = require("./app-menu.js");
    let result = this.parent;
    while (result && !(result instanceof ApplicationMenu)) {
      result = result.getParent();
    }

    if (result instanceof ApplicationMenu) {
      return result;
    }

    return null;
  }

  bounce() {
    this.element.classList.add("bounce");
    // Animation duration is 0.15s as defined in CSS
    setTimeout(() => {
      this.element.classList.remove("bounce");
    }, 150);
  }

  getElement() {
    return this.element;
  }

  getLabelText() {
    return this.labelText;
  }

  isSeparator() {
    return this.separator;
  }

  isEnabled() {
    return this.enabled;
  }

  isVisible() {
    return this.visible;
  }

  isSelected() {
    return this.selected;
  }

  isOpen() {
    return this.open;
  }

  getCommand() {
    return this.command;
  }

  getCommandDetail() {
    return this.commandDetail;
  }

  getAltTrigger() {
    return this.altTrigger;
  }

  getSubmenu() {
    return this.submenu;
  }

  hasSubmenu() {
    return this.submenu !== undefined;
  }

  getParent() {
    return this.parent;
  }

  isExecutable() {
    return this.enabled && !this.separator && !this.hasSubmenu();
  }

  setSelected(flag) {
    this.selected = flag;
    this.element.classList.toggle("selected", flag);
    if (!flag) {
      this.element.classList.remove("open");
    }
  }

  setOpen(flag) {
    this.open = flag;
    if (!flag) {
      this.submenu?.forEach((o) => {
        o.setOpen(false);
        o.setSelected(false);
      });
    }
    Utils.setToggleClass(this.element, "open", flag);
  }

  setParent(parent) {
    this.parent = parent;
  }
}

module.exports = { MenuItem };
