const { CompositeDisposable } = require("atom");
const { ThemeManager } = require("./theme.js");
const { TitleBarView } = require("./view.js");
const { Config } = require("./types.js");

class TitleBar {
  static configState = new Config();

  constructor() {
    this.subscriptions = new CompositeDisposable();
    this.titleBarView = undefined;
    this.initialized = false;
  }

  activate(state) {
    this.titleBarView = new TitleBarView(TitleBar.configState);
    this.initSubscriptions();

    this.subscriptions.add(
      atom.workspace.observeActivePane((pane) => {
        if (!this.initialized) {
          atom.workspace.element.prepend(this.titleBarView.getElement());
          this.titleBarView.updateTransforms();
          this.initialized = true;
        }
      })
    );

    if (atom.inDevMode()) {
      window.titleBar = this;
    }
  }

  initSubscriptions() {
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "title-bar:run-menu-updater": () => {
          this.titleBarView.updateMenu();
        },
        "title-bar:force-rebuild-application-menu": () => {
          this.titleBarView.rebuildApplicationMenu();
        },
      })
    );
    atom.config.observe("title-bar.autoHide", (value) => {
      TitleBar.configState.autoHide = value;
      if (value) {
        this.titleBarView.setMenuBarVisible(false);
      } else {
        this.titleBarView.setMenuBarVisible(true);
      }
    });
    atom.config.observe("title-bar.altGivesFocus", (value) => {
      TitleBar.configState.altGivesFocus = value;
    });
    atom.config.observe("title-bar.controlTheme", (value) => {
      TitleBar.configState.windowControlTheme = value;
      this.titleBarView.getThemeManager().setWindowControlTheme(value);
    });
    atom.config.observe("title-bar.logoStyle", (value) => {
      TitleBar.configState.logoStyle = value;
      this.titleBarView.setLogoStyle(value);
    });
    atom.config.observe("title-bar.customContextMenus", (value) => {
      TitleBar.configState.customContextMenus = value;
      const interceptor = this.titleBarView.getContextMenuInterceptor();
      if (value) {
        interceptor.activate();
      } else {
        interceptor.deactivate();
      }
    });
  }

  deactivate() {
    this.subscriptions?.dispose();
    this.titleBarView.deactivate();
  }

  serialize() {}

  deserialize(data) {}
}

module.exports = { TitleBar };
