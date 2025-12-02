const { MenuLabel } = require("./label.js");
const { Utils } = require("./utils.js");

// Lazy require to avoid circular dependency
let TitleBar = null;
function getTitleBar() {
  if (!TitleBar) {
    TitleBar = require("./replacer.js").TitleBar;
  }
  return TitleBar;
}

class ApplicationMenu {
  constructor(element, parent) {
    this.element = element;
    this.labels = [];
    this.attentive = false;
    this.showingAltKeys = false;
    this.parent = parent;

    window.addEventListener("click", (e) => this.blur());
    atom.workspace.onDidChangeActivePaneItem((item) => this.blur());

    document.body.addEventListener("keydown", (e) => this.onKeyDown(e));
    document.body.addEventListener("keyup", (e) => this.onKeyUp(e));
  }

  static createApplicationMenu(menuTemplate, parent) {
    const menuElement = document.createElement("div");
    menuElement.classList.add("app-menu");

    const self = new ApplicationMenu(menuElement, parent);

    self.labels = [];
    menuTemplate.forEach((o) => {
      try {
        self.addLabel(MenuLabel.createMenuLabel(o));
      } catch (e) {
        console.error(e);
      }
    });

    return self;
  }

  serialize() {
    return this.labels.map((o) => {
      return o.serialize();
    });
  }

  onLabelClicked(target, e) {
    if (target.isOpen()) {
      target.setOpen(false);
      return;
    }
    this.labels.forEach((o) => {
      o.setOpen(false);
    });
    target.setOpen(true);
  }

  onLabelMouseEnter(target, e) {
    const bar = getTitleBar();
    if (this.isOpen() && !target.isOpen() && bar.configState.openAdjacent) {
      this.onLabelClicked(target, e);
    }
  }

  onKeyDown(e) {
    const bar = getTitleBar();
    if (
      !e.repeat &&
      (e.key === "Alt" || e.key === "Escape") &&
      (this.showingAltKeys || this.isOpen() || this.isFocused())
    ) {
      this.close();
      this.getFocusedLabel()?.setFocused(false);
      this.attentive = false;
      this.showAltKeys(false);
      return;
    }

    if (e.key === "Alt") {
      if (e.repeat) {
        return;
      }
      this.attentive = !this.attentive;
      if (bar.configState.menuBarMnemonics) {
        this.showAltKeys(!this.showingAltKeys);
      }
      return;
    }

    const openLabel = this.getOpenLabel();
    const focusedLabel = this.getFocusedLabel();
    if (openLabel) {
      let selected = this.getSelectedLeaf();
      switch (e.key) {
        case "ArrowUp":
          if (!selected) {
            openLabel.getSubmenu().selectLastItem();
          } else {
            selected.getParent()?.getSubmenu()?.selectPreviousItem();
          }
          Utils.stopEvent(e);
          return;

        case "ArrowDown":
          if (!selected) {
            openLabel.getSubmenu().selectFirstItem();
          } else {
            selected.getParent()?.getSubmenu()?.selectNextItem();
          }
          Utils.stopEvent(e);
          return;

        case "ArrowLeft":
          if (!selected || selected.getParent() instanceof MenuLabel) {
            this.openPreviousLabel();
          } else {
            selected.getParent()?.setOpen(false);
          }
          Utils.stopEvent(e);
          return;

        case "ArrowRight":
          if (!selected || !selected.hasSubmenu()) {
            this.openNextLabel();
          } else {
            selected.setOpen(true);
            selected.getSubmenu()?.selectFirstItem();
          }
          Utils.stopEvent(e);
          return;

        case "Enter":
          if (selected && !selected.hasSubmenu()) {
            selected.execCommand();
            this.close();
            this.attentive = false;
            this.showAltKeys(false);
            Utils.stopEvent(e);
            return;
          }
          break;

        case " ": // Space
          if (selected && !selected.hasSubmenu()) {
            selected.bounce();
            selected.execCommand();
            Utils.stopEvent(e);
            return;
          }
          break;
      }

      if (this.showingAltKeys && !e.repeat) {
        let target = this.getOpenLeaf();
        if (target) {
          let handled = false;

          target
            .getSubmenu()
            ?.getSelectable()
            .some((o) => {
              if (
                o.getAltTrigger() !== undefined &&
                o.getAltTrigger() === e.key.toLowerCase()
              ) {
                o.execCommand();
                this.close();
                this.attentive = false;
                this.showAltKeys(false);
                Utils.stopEvent(e);
                handled = true;
                return true;
              }
              return false;
            });

          if (handled) {
            return;
          }
        }
      }
    } else {
      if (focusedLabel) {
        switch (e.key) {
          case "Enter":
          case "ArrowDown":
            focusedLabel.setOpen(true);
            Utils.stopEvent(e);
            return;

          case "ArrowLeft":
            this.focusPreviousLabel();
            Utils.stopEvent(e);
            return;

          case "ArrowRight":
            this.focusNextLabel();
            Utils.stopEvent(e);
            return;
        }
      }
      if (this.showingAltKeys && !e.repeat) {
        let handled = false;

        this.labels.some((o) => {
          if (
            o.getAltTrigger() !== undefined &&
            o.getAltTrigger() === e.key.toLowerCase()
          ) {
            if (focusedLabel) {
              focusedLabel.setFocused(false);
            }
            o.setOpen(true);
            Utils.stopEvent(e);
            handled = true;
            return true;
          }
          return false;
        });

        if (handled) {
          return;
        }
      }
    }

    this.attentive = false;
    this.showAltKeys(false);
  }

  onKeyUp(e) {
    const bar = getTitleBar();
    if (e.key === "Alt" && !this.isFocused() && !this.isOpen()) {
      if (this.showingAltKeys) {
        if (!bar.configState.altGivesFocus && !bar.configState.autoHide) {
          this.showAltKeys(false);
        }
      }

      if (this.attentive) {
        if (bar.configState.autoHide) {
          this.parent?.setMenuBarVisible(true);
        }

        if (bar.configState.autoHide || bar.configState.altGivesFocus) {
          this.focusFirstLabel();
        }
      }

      this.attentive = false;
    }
  }

  blur() {
    this.close();
    this.getFocusedLabel()?.setFocused(false);
    this.attentive = false;
    this.showAltKeys(false);
  }

  close() {
    const bar = getTitleBar();
    this.labels.forEach((o) => {
      if (o.isOpen()) {
        o.setOpen(false);
      }
    });

    if (bar.configState.autoHide) {
      this.parent?.setMenuBarVisible(false);
    }

    if (!bar.configState.menuBarMnemonics) {
      this.attentive = true;
    }
  }

  showAltKeys(flag) {
    Utils.setToggleClass(this.element, "alt-down", flag);
    this.showingAltKeys = flag;
  }

  openFirstLabel() {
    this.labels[0]?.setOpen(true);
  }

  openLastLabel() {
    this.labels[this.labels.length - 1]?.setOpen(true);
  }

  openNextLabel() {
    let label = this.getOpenLabel();
    if (label) {
      label.setOpen(false);
      this.labels[
        Utils.mod(this.labels.indexOf(label) + 1, this.labels.length)
      ].setOpen(true);
    }
  }

  openPreviousLabel() {
    let label = this.getOpenLabel();
    if (label) {
      label.setOpen(false);
      this.labels[
        Utils.mod(this.labels.indexOf(label) - 1, this.labels.length)
      ].setOpen(true);
    }
  }

  focusFirstLabel() {
    this.labels.forEach((o) => {
      o.setFocused(false);
    });
    this.labels[0]?.setFocused(true);
  }

  focusLastLabel() {
    this.labels.forEach((o) => {
      o.setFocused(false);
    });
    this.labels[this.labels.length - 1]?.setFocused(true);
  }

  focusNextLabel() {
    let label = this.getFocusedLabel();
    if (label) {
      label.setFocused(false);
      this.labels[
        Utils.mod(this.labels.indexOf(label) + 1, this.labels.length)
      ].setFocused(true);
    }
  }

  focusPreviousLabel() {
    let label = this.getFocusedLabel();
    if (label) {
      label.setFocused(false);
      this.labels[
        Utils.mod(this.labels.indexOf(label) - 1, this.labels.length)
      ].setFocused(true);
    }
  }

  getOpenLeaf() {
    let result = null;

    const recurseItem = (item) => {
      let curr = null;
      item.getSubmenu()?.some((o) => {
        if (o.hasSubmenu() && o.isOpen()) {
          curr = o;
          let tmp = recurseItem(o);
          if (tmp !== null) {
            curr = tmp;
          }
          return true;
        }
        return false;
      });
      return curr;
    };

    this.labels.some((o) => {
      if (o.isOpen()) {
        result = o;
        let tmp = recurseItem(o);
        if (tmp !== null) {
          result = tmp;
        }
        return true;
      }
      return false;
    });

    return result;
  }

  getSelectedLeaf() {
    let result = null;

    const recurseItem = (item) => {
      let curr = null;
      item.getSubmenu()?.some((o) => {
        if (o.isSelected()) {
          curr = o;
          if (o.hasSubmenu() && o.isOpen()) {
            let tmp = recurseItem(o);
            if (tmp !== null) {
              curr = tmp;
            }
            return true;
          }
        }
        return false;
      });
      return curr;
    };

    this.labels.some((o) => {
      if (o.isOpen()) {
        let tmp = recurseItem(o);
        if (tmp !== null) {
          result = tmp;
        }
        return true;
      }
      return false;
    });

    return result;
  }

  getOpenLabel() {
    return this.labels.find((o) => o.isOpen()) || null;
  }

  getFocusedLabel() {
    return this.labels.find((o) => o.isFocused()) || null;
  }

  getElement() {
    return this.element;
  }

  getLabels() {
    return this.labels;
  }

  isOpen() {
    return this.getOpenLabel() !== null;
  }

  isFocused() {
    return this.getFocusedLabel() !== null;
  }

  addLabel(labelItem) {
    labelItem.setParent(this);
    this.labels.push(labelItem);
    this.element.appendChild(labelItem.getElement());
  }

  insertLabel(item, index) {
    item.setParent(this);
    this.labels.splice(index, 0, item);
    this.element.insertBefore(
      item.getElement(),
      item.getElement().parentElement?.children[index] || null
    );
  }

  removeLabel(x) {
    if (x instanceof MenuLabel) {
      this.labels.splice(this.labels.indexOf(x), 1);
      x.getElement().parentElement?.removeChild(x.getElement());
      return;
    }

    const item = this.labels.splice(x, 1)[0];
    item?.getElement().parentElement?.removeChild(item?.getElement());
  }
}

module.exports = { ApplicationMenu };
