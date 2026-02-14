const { CompositeDisposable } = require("atom");
require("./theme.js");
const { TitleBarView } = require("./view.js");
const { Config } = require("./types.js");

class TitleBar {
  static configState = new Config();

  constructor() {
    this.subscriptions = new CompositeDisposable();
    this.titleBarView = undefined;
    this.initialized = false;
  }

  activate() {
    this.titleBarView = new TitleBarView(TitleBar.configState);
    this.initSubscriptions();

    this.subscriptions.add(
      atom.workspace.observeActivePane(() => {
        if (!this.initialized) {
          atom.workspace.element.prepend(this.titleBarView.getElement());
          this.titleBarView.updateTransforms();
          this.initialized = true;
        }
      }),
    );

    if (atom.inDevMode()) {
      window.titleBar = this;
    }
  }

  initSubscriptions() {
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "title-bar:toggle": () => {
          const visible = this.titleBarView.isTitleBarVisible();
          this.titleBarView.setTitleBarVisible(!visible);
        },
      }),
    );

    this.subscriptions.add(
      atom.config.observe("title-bar.autoHide", (value) => {
        TitleBar.configState.autoHide = value;
        if (value) {
          this.titleBarView.setMenuBarVisible(false);
        } else {
          this.titleBarView.setMenuBarVisible(true);
        }
      }),
    );
    this.subscriptions.add(
      atom.config.observe("title-bar.altGivesFocus", (value) => {
        TitleBar.configState.altGivesFocus = value;
      }),
    );
    this.subscriptions.add(
      atom.config.observe("title-bar.controlTheme", (value) => {
        TitleBar.configState.windowControlTheme = value;
        this.titleBarView.getThemeManager().setWindowControlTheme(value);
      }),
    );
    this.subscriptions.add(
      atom.config.observe("title-bar.logoStyle", (value) => {
        TitleBar.configState.logoStyle = value;
        this.titleBarView.setLogoStyle(value);
      }),
    );
    this.subscriptions.add(
      atom.config.observe("title-bar.customContextMenus", (value) => {
        TitleBar.configState.customContextMenus = value;
        const interceptor = this.titleBarView.getContextMenuInterceptor();
        if (value) {
          interceptor.activate();
        } else {
          interceptor.deactivate();
        }
      }),
    );
  }

  deactivate() {
    this.subscriptions?.dispose();
    this.titleBarView.deactivate();
  }

  serialize() {}

  deserialize() {}
}

module.exports = { TitleBar };
