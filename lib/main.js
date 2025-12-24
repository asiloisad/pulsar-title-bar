const { TitleBar } = require("./replacer.js");
const { ApplicationMenu } = require("./app-menu.js");
const { MenuUpdater } = require("./updater.js");
const { Diff, EditToken } = require("./diff.js");
const { ControlTiles } = require("./control-tiles.js");

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

function provideControlTiles() {
  return titleBar.titleBarView?.getControlTiles();
}

module.exports = {
  ApplicationMenu,
  MenuUpdater,
  ControlTiles,
  Diff,
  EditToken,
  activate,
  deactivate,
  serialize,
  provideControlTiles,
};
