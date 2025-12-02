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

// Tile service API (similar to status-bar)
function addLeftTile(options) {
  return titleBar.titleBarView?.addLeftTile(options);
}

function addRightTile(options) {
  return titleBar.titleBarView?.addRightTile(options);
}

function getLeftTiles() {
  return titleBar.titleBarView?.getLeftTiles() ?? [];
}

function getRightTiles() {
  return titleBar.titleBarView?.getRightTiles() ?? [];
}

// Service provider for other packages
function provideTitleBar() {
  return {
    addLeftTile,
    addRightTile,
    getLeftTiles,
    getRightTiles,
  };
}

module.exports = {
  ApplicationMenu,
  MenuUpdater,
  Diff,
  EditToken,
  activate,
  deactivate,
  serialize,
  provideTitleBar,
  addLeftTile,
  addRightTile,
  getLeftTiles,
  getRightTiles,
};
