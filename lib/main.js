const { FancyBar } = require("./replacer.js");
const { ApplicationMenu } = require("./app-menu.js");
const { MenuUpdater } = require("./updater.js");
const { Diff, EditToken } = require("./diff.js");

const fancyBar = new FancyBar();

function activate(state) {
  fancyBar.activate(state);
}

function deactivate() {
  fancyBar.deactivate();
}

function serialize() {
  return fancyBar.serialize();
}

module.exports = {
  ApplicationMenu,
  MenuUpdater,
  Diff,
  EditToken,
  activate,
  deactivate,
  serialize,
};
