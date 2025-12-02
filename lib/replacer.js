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
        "title-bar:toggle-title-bar": () => {
          TitleBar.configState.displayTitleBar = !TitleBar.configState
            .displayTitleBar;
          this.titleBarView.setTitleBarVisible(
            TitleBar.configState.displayTitleBar
          );
        },
        "title-bar:toggle-menu-bar": () => {
          TitleBar.configState.displayMenuBar = !TitleBar.configState
            .displayMenuBar;
          this.titleBarView.setMenuBarVisible(
            TitleBar.configState.displayMenuBar
          );
        },
        "title-bar:auto-select-colors": () => {
          TitleBar.configState.autoSelectColor = !TitleBar.configState
            .autoSelectColor;
          TitleBar.configState.autoSelectColor
            ? ThemeManager.clearCustomColors()
            : ThemeManager.applyCustomColors();
        },
        "title-bar:run-menu-updater": () => {
          this.titleBarView.updateMenu();
        },
        "title-bar:force-rebuild-application-menu": () => {
          this.titleBarView.rebuildApplicationMenu();
        },
      })
    );
    atom.config.observe("title-bar.displayTitleBar", (value) => {
      TitleBar.configState.displayTitleBar = value;
      this.titleBarView.setTitleBarVisible(value);
    });
    atom.config.observe("title-bar.displayMenuBar", (value) => {
      TitleBar.configState.displayMenuBar = value;
      if (!TitleBar.configState.autoHide) {
        this.titleBarView.setMenuBarVisible(value);
      }
    });
    atom.config.observe("title-bar.openAdjacent", (value) => {
      TitleBar.configState.openAdjacent = value;
    });
    atom.config.observe("title-bar.autoHide", (value) => {
      TitleBar.configState.autoHide = value;
      if (value) {
        this.titleBarView.setMenuBarVisible(false);
      } else {
        this.titleBarView.setMenuBarVisible(
          TitleBar.configState.displayMenuBar
        );
      }
    });
    atom.config.observe("title-bar.hideFullscreenTitle", (value) => {
      TitleBar.configState.hideFullscreenTitle = value;
      if (atom.isFullScreen()) {
        this.titleBarView.setTitleBarVisible(!value);
      }
    });
    atom.config.observe("title-bar.altGivesFocus", (value) => {
      TitleBar.configState.altGivesFocus = value;
    });
    atom.config.observe("title-bar.menuBarMnemonics", (value) => {
      TitleBar.configState.menuBarMnemonics = value;
    });
    atom.config.observe("title-bar.autoSelectColor", (value) => {
      TitleBar.configState.autoSelectColor = value;
      value
        ? ThemeManager.clearCustomColors()
        : ThemeManager.applyCustomColors();
    });
    atom.config.observe("title-bar.baseColor", (value) => {
      TitleBar.configState.baseColor = value;
      if (!TitleBar.configState.autoSelectColor && this.initialized) {
        ThemeManager.applyCustomColors();
      }
    });
    atom.config.observe("title-bar.highlightColor", (value) => {
      TitleBar.configState.highlightColor = value;
      if (!TitleBar.configState.autoSelectColor && this.initialized) {
        ThemeManager.applyCustomColors();
      }
    });
    atom.config.observe("title-bar.textColor", (value) => {
      TitleBar.configState.textColor = value;
      if (!TitleBar.configState.autoSelectColor && this.initialized) {
        ThemeManager.applyCustomColors();
      }
    });
    atom.config.observe("title-bar.controlTheme", (value) => {
      TitleBar.configState.windowControlTheme = value;
      this.titleBarView.getThemeManager().setWindowControlTheme(value);
    });
    atom.config.observe("title-bar.controlLocation", (value) => {
      TitleBar.configState.reverseWindowControls = value;
      this.titleBarView.getThemeManager().setReverseWindowControls(value);
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
