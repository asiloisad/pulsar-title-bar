const { ApplicationMenu } = require("./app-menu.js");
const { MenuItem } = require("./item.js");
const { MenuLabel } = require("./label.js");
const { Diff, EditToken } = require("./diff.js");

class MenuUpdater {
  static run(appMenu) {
    const template = structuredClone(atom.menu.template);

    if (!(template instanceof Array)) {
      console.error(
        "MenuUpdater: Menu template is malformed! Cannot perform menu update."
      );
      return 0;
    }

    template.some((o) => {
      if (o.label === "&Packages") {
        o.submenu?.sort((a, b) => {
          if (a.label !== undefined && b.label !== undefined) {
            const aL = a.label.toLowerCase(),
              bL = b.label.toLowerCase();
            if (aL < bL) return -1;
            if (aL > bL) return 1;
          }
          return 0;
        });
        return true;
      }
      return false;
    });

    return MenuUpdater.recurse(appMenu, appMenu.getLabels(), template);
  }

  static recurse(parent, a, b) {
    let edits = 0;
    const diff = new Diff(a, b, MenuUpdater.equals);
    const editscript = diff.createEditScript();
    edits += MenuUpdater.execEditScript(parent, a, b, editscript);

    a.forEach((o, i) => {
      const aSub = o.getSubmenu(),
        bSub = b[i].submenu;
      if (aSub !== undefined) {
        if (!(bSub instanceof Array)) {
          console.error("MenuUpdater: malformed menu template item!", b[i]);
          return;
        }
        edits += MenuUpdater.recurse(o, aSub, bSub);
      }
    });

    return edits;
  }

  static execEditScript(parent, a, b, script) {
    let ai = 0,
      bi = 0,
      edits = script.length;
    script.forEach((opr) => {
      switch (opr) {
        case EditToken.NOOP:
          ai++, bi++;
          edits--;
          return;

        case EditToken.DELETE:
          if (parent instanceof ApplicationMenu) {
            parent.removeLabel(ai);
          } else {
            parent.removeChild(ai);
          }
          break;

        case EditToken.INSERT:
          if (parent instanceof ApplicationMenu) {
            const newItem = MenuLabel.createMenuLabel(b[bi]);
            parent.insertLabel(newItem, ai++);
          } else {
            const newItem = MenuItem.createMenuItem(b[bi]);
            parent.insertChild(newItem, ai++);
          }
          bi++;
          break;

        case EditToken.REPLACE:
          if (parent instanceof ApplicationMenu) {
            parent.removeLabel(ai);
            const newItem = MenuLabel.createMenuLabel(b[bi]);
            parent.insertLabel(newItem, ai++);
          } else {
            parent.removeChild(ai);
            const newItem = MenuItem.createMenuItem(b[bi]);
            parent.insertChild(newItem, ai++);
          }
          break;
      }
    });

    return edits;
  }

  static equals(a, b) {
    if (a === undefined || b === undefined) {
      return false;
    }

    if (a instanceof MenuLabel) {
      return a.getLabelText() === b.label;
    }

    if (a instanceof MenuItem) {
      if (a.isSeparator()) {
        return b.type === "separator";
      }
      if (a.getCommand() !== undefined) {
        return a.getCommand() === b.command;
      }
      return a.getLabelText() === b.label;
    }

    return false;
  }
}

module.exports = { MenuUpdater };
