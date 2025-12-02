const { Utils } = require("./utils.js");

class Submenu extends Array {
  getSelected() {
    return this.find((o) => o.isSelected()) || null;
  }

  getSelectable() {
    return this.filter(
      (o) => o.isEnabled() && o.isVisible() && !o.isSeparator()
    );
  }

  selectFirstItem() {
    const selectable = this.getSelectable();
    if (selectable.length < 1) {
      return;
    }
    this.getSelected()?.setSelected(false);
    selectable[0].setSelected(true);
  }

  selectLastItem() {
    const selectable = this.getSelectable();
    if (selectable.length < 1) {
      return;
    }
    this.getSelected()?.setSelected(false);
    selectable[selectable.length - 1].setSelected(true);
  }

  selectNextItem() {
    const selectable = this.getSelectable();
    if (selectable.length <= 1) {
      return;
    }

    const selected = this.getSelected();
    if (selected) {
      let i = selectable.indexOf(selected);
      selected.setSelected(false);
      selectable[Utils.mod(i + 1, selectable.length)].setSelected(true);
    }
  }

  selectPreviousItem() {
    const selectable = this.getSelectable();
    if (selectable.length <= 1) {
      return;
    }

    const selected = this.getSelected();
    if (selected) {
      let i = selectable.indexOf(selected);
      selected.setSelected(false);
      selectable[Utils.mod(i - 1, selectable.length)].setSelected(true);
    }
  }
}

module.exports = { Submenu };
