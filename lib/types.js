const MenuEvent = Object.freeze({
  MOUSE_CLICK: Symbol(),
  MOUSE_ENTER: Symbol(),
});

class Config {
  constructor() {
    this.displayTitleBar = false;
    this.displayMenuBar = false;
    this.openAdjacent = false;
    this.autoHide = false;
    this.hideFullscreenTitle = false;
    this.altGivesFocus = false;
    this.menuBarMnemonics = false;
    this.autoSelectColor = false;
    this.baseColor = undefined;
    this.highlightColor = undefined;
    this.textColor = undefined;
    this.windowControlTheme = "";
    this.reverseWindowControls = false;
  }
}

const titleBarStyles = {
  Compact: {
    cssId: "style-compact",
  },
};

const controlThemes = {
  "Windows 10": {
    cssClass: "control-theme-windows-10",
  },
  Arc: {
    cssClass: "control-theme-arc",
  },
  Yosemite: {
    cssClass: "control-theme-yosemite",
  },
  Legacy: {
    cssClass: "control-theme-legacy",
  },
};

const cssSelectors = {
  base: [
    ".fancy-bar, .fancy-bar::before",
    ".app-menu .menu-label.open, .app-menu .menu-label:hover, " +
      ".app-menu .menu-label.open, .app-menu .menu-label.focused", //10% darker
    ".app-menu .menu-label .menu-box", //ligther
  ],
  hi: [
    ".app-menu .menu-label .menu-box .menu-item.open, .app-menu .menu-label .menu-box " +
      ".menu-item.selected",
  ],
  txt: [
    ".fancy-bar",
    ".fancy-bar .custom-title, .app-menu .menu-label .menu-box hr, " +
      ".app-menu .menu-label .menu-box .menu-item .menu-item-keystroke, " +
      ".app-menu .menu-label .menu-box .menu-item.disabled", //subtle
    ".title-bar i, .title-bar i.disabled, .app-menu .menu-label .menu-box " +
      ".menu-item", //highlight
  ],
};

const exceptionCommands = new Set([
  "application:open-terms-of-use",
  "application:open-documentation",
  "application:open-faq",
  "application:open-discussions",
  "application:report-issue",
  "application:search-issues",
]);

module.exports = {
  MenuEvent,
  Config,
  titleBarStyles,
  controlThemes,
  cssSelectors,
  exceptionCommands,
};
