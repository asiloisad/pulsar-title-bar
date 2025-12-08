const { shell } = require("electron");
const { MalformedTemplateError } = require("./error.js");
const { exceptionCommands } = require("./types.js");
const { Utils } = require("./utils.js");
const { Submenu } = require("./submenu.js");
const SubmenuParent = require("./submenu-parent.js");

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
    this.targetElement = undefined;
    SubmenuParent.initSubmenuParent(this);

    // Portal support for scroll
    this.portalElement = null;
    this.portalContainer = null;

    this.element.addEventListener("click", (e) => this.onMouseClick(e));
    this.element.addEventListener("mouseenter", (e) => this.onMouseEnter(e));
    this.element.addEventListener("mousemove", (e) => this.onMouseMove(e));
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

    if (menuItem.submenu instanceof Array) {
      if (menuItem.submenu.length === 0) {
        // Create empty submenu container for dynamic population
        self.submenu = new Submenu();
        self.element.classList.add("has-sub");
        self.menuBox = document.createElement("div");
        self.menuBox.classList.add("menu-box", "menu-item-submenu");
        self.element.appendChild(self.menuBox);
      } else {
        menuItem.submenu.forEach((o) => {
          try {
            self.addChild(MenuItem.createMenuItem(o));
          } catch (e) {
            console.error(e);
          }
        });
      }
    }

    return self;
  }

  static createContextMenuItem(template, targetElement) {
    // Clean up labels for context menus
    const cleanedTemplate = MenuItem.cleanTemplateLabels(template);
    const item = MenuItem.createMenuItem(cleanedTemplate);
    item.targetElement = targetElement;

    // Recursively set targetElement on submenu items
    if (item.hasSubmenu()) {
      MenuItem.setTargetElementRecursive(item, targetElement);
    }

    return item;
  }

  static cleanTemplateLabels(template) {
    if (!template) return template;

    const cleaned = { ...template };

    // Clean the label if present
    if (cleaned.label) {
      cleaned.label = Utils.cleanContextMenuLabel(cleaned.label);
    }

    // Recursively clean submenu items
    if (cleaned.submenu && Array.isArray(cleaned.submenu)) {
      cleaned.submenu = cleaned.submenu.map((item) =>
        MenuItem.cleanTemplateLabels(item)
      );
    }

    return cleaned;
  }

  static setTargetElementRecursive(item, targetElement) {
    if (item.hasSubmenu()) {
      item.getSubmenu().forEach((subitem) => {
        if (subitem instanceof MenuItem) {
          subitem.targetElement = targetElement;
          MenuItem.setTargetElementRecursive(subitem, targetElement);
        }
      });
    }
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
      // Save command info before closing menu
      const command = this.command;
      const commandDetail = this.commandDetail;
      const targetElement = this.targetElement;
      const root = this.getAppMenuRoot();

      // Close menu first
      root?.close();

      // Double rAF ensures paint completes before command runs
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          this.execCommandWith(command, commandDetail, targetElement);
        });
      });
    }
  }

  onMouseEnter(e) {
    e.stopPropagation();
    this.parent?.onChildMouseEnter?.(this, e);
  }

  onMouseMove(e) {
    e.stopPropagation();
    this.parent?.onChildMouseMove?.(this, e);
  }

  onChildMouseEnter(target, e) {
    SubmenuParent.onChildMouseEnter(this, target, e);
  }

  onChildMouseMove(target, e) {
    SubmenuParent.onChildMouseMove(this, target, e);
  }

  clearFocus() {
    SubmenuParent.clearFocus(this);
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

    // Context menu: dispatch to the element that was right-clicked
    // Application menu: dispatch to active editor/pane
    let target = this.targetElement ||
      atom.workspace.getActiveTextEditor()?.getElement() ||
      atom.workspace.getActivePane().getElement();

    await atom.commands.dispatch(target, this.command, this.commandDetail);
  }

  async execCommandWith(command, commandDetail, targetElement) {
    if (command === undefined) {
      return;
    }

    if (exceptionCommands.has(command)) {
      switch (command) {
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

    // Context menu: dispatch to the element that was right-clicked
    // Application menu: dispatch to active editor/pane
    let target =
      targetElement ||
      atom.workspace.getActiveTextEditor()?.getElement() ||
      atom.workspace.getActivePane().getElement();

    await atom.commands.dispatch(target, command, commandDetail);
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
    const { ContextMenu } = require("./context-menu.js");
    let result = this.parent;
    while (
      result &&
      !(result instanceof ApplicationMenu) &&
      !(result instanceof ContextMenu)
    ) {
      result = result.getParent();
    }

    if (result instanceof ApplicationMenu || result instanceof ContextMenu) {
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
    if (!flag && !this.open) {
      this.element.classList.remove("open");
    }
  }

  setOpen(flag) {
    this.open = flag;

    // Clear any pending submenu timer when closing
    if (!flag && this.submenuTimer) {
      clearTimeout(this.submenuTimer);
      this.submenuTimer = null;
    }

    // Handle portaled submenu visibility
    if (this.portalElement) {
      if (flag) {
        this.positionPortaledSubmenu();
        this.portalElement.classList.add("visible");
      } else {
        this.portalElement.classList.remove("visible");
      }
    }

    if (!flag) {
      this.submenu?.forEach((o) => {
        o.setOpen(false);
        o.setSelected(false);
      });
    }

    // When opening submenu, clear own selection
    if (flag && this.hasSubmenu()) {
      this.setSelected(false);
    }

    Utils.setToggleClass(this.element, "open", flag);
  }

  setParent(parent) {
    this.parent = parent;
  }

  // Portal methods for scroll support
  moveSubmenuToPortal(portalContainer) {
    if (!this.hasSubmenu() || !this.menuBox || this.portalElement || !portalContainer) return;

    this.portalContainer = portalContainer;

    // Create portal element
    this.portalElement = document.createElement("div");
    this.portalElement.classList.add("menu-box", "menu-item-submenu");

    // Move children to portal element
    while (this.menuBox.firstChild) {
      this.portalElement.appendChild(this.menuBox.firstChild);
    }

    // Add to portal container
    portalContainer.appendChild(this.portalElement);

    // Hide original menu-box
    this.menuBox.style.display = "none";

    // Set up event delegation for portal element
    this.portalElement.addEventListener("click", (e) => e.stopPropagation());
    this.portalElement.addEventListener("mouseenter", (e) => e.stopPropagation());
    this.portalElement.addEventListener("mouseleave", () => this.clearFocus());

    // Add scroll handler to reposition nested submenus
    this.portalElement.addEventListener("scroll", () => {
      this.submenu?.forEach((item) => {
        if (item.isOpen() && item.isPortaled()) {
          item.positionPortaledSubmenu();
        }
      });
    });
  }

  positionPortaledSubmenu() {
    if (!this.portalElement) return;

    const itemRect = this.element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Positioning constants
    const horizontalOverlap = 4; // Overlap with parent menu for visual continuity
    const verticalOffset = 6; // Offset from item top (accounts for menu padding)
    const edgePadding = 8; // Minimum distance from viewport edges
    const minHeight = 100;

    // Temporarily make visible to measure
    const wasHidden = !this.portalElement.classList.contains("visible");
    if (wasHidden) {
      this.portalElement.style.visibility = "hidden";
      this.portalElement.style.maxHeight = ""; // Reset for measurement
      this.portalElement.classList.add("visible");
    }

    const submenuRect = this.portalElement.getBoundingClientRect();

    if (wasHidden) {
      this.portalElement.classList.remove("visible");
      this.portalElement.style.visibility = "";
    }

    // Calculate horizontal position
    let left;
    let flipToLeft = false;

    // Check if submenu fits on the right
    const rightPosition = itemRect.right - horizontalOverlap;
    if (rightPosition + submenuRect.width <= viewportWidth - edgePadding) {
      left = rightPosition;
    } else {
      // Flip to left side
      flipToLeft = true;
      left = itemRect.left - submenuRect.width + horizontalOverlap;
    }

    // Ensure left doesn't go off-screen
    left = Math.max(edgePadding, left);
    if (!flipToLeft && left + submenuRect.width > viewportWidth - edgePadding) {
      left = viewportWidth - submenuRect.width - edgePadding;
    }

    // Calculate vertical position - align with parent item
    let top = itemRect.top - verticalOffset;

    // Calculate available heights
    const availableHeightBelow = viewportHeight - top - edgePadding;
    const availableHeightAbove = itemRect.bottom - edgePadding;

    let maxHeight;
    const actualHeight = Math.min(submenuRect.height, viewportHeight - 2 * edgePadding);

    if (actualHeight <= availableHeightBelow) {
      // Fits below - use default position
      maxHeight = availableHeightBelow;
    } else if (availableHeightAbove > availableHeightBelow && actualHeight <= availableHeightAbove) {
      // Fits above - align bottom of submenu with bottom of item
      top = itemRect.bottom - actualHeight + verticalOffset;
      maxHeight = availableHeightAbove;
    } else {
      // Doesn't fit either way - use larger space with scroll
      if (availableHeightAbove > availableHeightBelow) {
        maxHeight = Math.max(minHeight, availableHeightAbove);
        top = itemRect.bottom - Math.min(submenuRect.height, maxHeight) + verticalOffset;
      } else {
        maxHeight = Math.max(minHeight, availableHeightBelow);
      }
    }

    // Final bounds check
    top = Math.max(edgePadding, top);
    const effectiveHeight = Math.min(submenuRect.height, maxHeight);
    if (top + effectiveHeight > viewportHeight - edgePadding) {
      top = viewportHeight - effectiveHeight - edgePadding;
      top = Math.max(edgePadding, top);
    }

    this.portalElement.style.left = `${left}px`;
    this.portalElement.style.top = `${top}px`;
    this.portalElement.style.maxHeight = `${maxHeight}px`;
  }

  isPortaled() {
    return this.portalElement !== null;
  }

  getPortalElement() {
    return this.portalElement;
  }
}

module.exports = { MenuItem };
