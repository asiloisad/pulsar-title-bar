const { TitleBar } = require("./replacer.js");
const { ApplicationMenu } = require("./app-menu.js");
const { MenuUpdater } = require("./updater.js");
const { Diff, EditToken } = require("./diff.js");

const titleBar = new TitleBar();

function activate(state) {
  titleBar.activate(state);
}

function deactivate() {
  titleBar.deactivate();
}

function serialize() {
  return titleBar.serialize();
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
