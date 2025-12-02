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

const controlThemes = {
  "Windows 11": {
    cssClass: "control-theme-windows-11",
  },
  Yosemite: {
    cssClass: "control-theme-yosemite",
  },
};

const cssSelectors = {
  base: [
    ".title-bar-replacer, .title-bar-replacer::before",
    ".app-menu .menu-label.open, .app-menu .menu-label:hover, " +
      ".app-menu .menu-label.open, .app-menu .menu-label.focused", //10% darker
    ".app-menu .menu-label .menu-box", //ligther
  ],
  hi: [
    ".app-menu .menu-label .menu-box .menu-item.open, .app-menu .menu-label .menu-box " +
      ".menu-item.selected",
  ],
  txt: [
    ".title-bar-replacer",
    ".title-bar-replacer .custom-title, .app-menu .menu-label .menu-box hr, " +
      ".app-menu .menu-label .menu-box .menu-item .menu-item-keystroke, " +
      ".app-menu .menu-label .menu-box .menu-item.disabled", //subtle
    ".title-bar button, .title-bar button.disabled, .app-menu .menu-label .menu-box " +
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
  controlThemes,
  cssSelectors,
  exceptionCommands,
};
