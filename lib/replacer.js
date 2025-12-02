const { CompositeDisposable } = require("atom");
const { ThemeManager } = require("./theme.js");
const { FancyBarView } = require("./view.js");
const { Config } = require("./types.js");

class FancyBar {
  static configState = new Config();

  constructor() {
    this.subscriptions = new CompositeDisposable();
    this.fancyBarView = undefined;
    this.initialized = false;
  }

  activate(state) {
    this.fancyBarView = new FancyBarView(FancyBar.configState);
    this.initSubscriptions();

    this.subscriptions.add(
      atom.workspace.observeActivePane((pane) => {
        if (!this.initialized) {
          let last = performance.now();
          atom.workspace.element.prepend(this.fancyBarView.getElement());
          this.fancyBarView.updateTransforms();
          this.initialized = true;
        }
      })
    );

    if (atom.inDevMode()) {
      window.fancyBar = this;
    }
  }

  initSubscriptions() {
    this.subscriptions.add(
      atom.commands.add("atom-workspace", {
        "fancy-bar:toggle-title-bar": () => {
          FancyBar.configState.displayTitleBar = !FancyBar.configState
            .displayTitleBar;
          this.fancyBarView.setTitleBarVisible(
            FancyBar.configState.displayTitleBar
          );
        },
        "fancy-bar:toggle-menu-bar": () => {
          FancyBar.configState.displayMenuBar = !FancyBar.configState
            .displayMenuBar;
          this.fancyBarView.setMenuBarVisible(
            FancyBar.configState.displayMenuBar
          );
        },
        "fancy-bar:auto-select-colors": () => {
          FancyBar.configState.autoSelectColor = !FancyBar.configState
            .autoSelectColor;
          FancyBar.configState.autoSelectColor
            ? ThemeManager.clearCustomColors()
            : ThemeManager.applyCustomColors();
        },
        "fancy-bar:run-menu-updater": () => {
          this.fancyBarView.updateMenu();
        },
        "fancy-bar:force-rebuild-application-menu": () => {
          this.fancyBarView.rebuildApplicationMenu();
        },
        "fancy-bar:remove-window-frame": async () => {
          atom.confirm({
            message: "Title Bar Replacer",
            detailedMessage:
              "Hello old user! Thank you for still using fancy-bar. As of " +
              "Atom v1.53 you no longer need to patch Atom in order to remove the " +
              "window frame. You can now hide the native title bar by going to: \n" +
              "Settings > Core > Title Bar\n " +
              "And setting it to 'hidden'.",
          });
        },
      })
    );
    atom.config.observe("fancy-bar.general.displayTitleBar", (value) => {
      FancyBar.configState.displayTitleBar = value;
      this.fancyBarView.setTitleBarVisible(value);
    });
    atom.config.observe("fancy-bar.general.displayMenuBar", (value) => {
      FancyBar.configState.displayMenuBar = value;
      if (!FancyBar.configState.autoHide) {
        this.fancyBarView.setMenuBarVisible(value);
      }
    });
    atom.config.observe("fancy-bar.general.openAdjacent", (value) => {
      FancyBar.configState.openAdjacent = value;
    });
    atom.config.observe("fancy-bar.general.autoHide", (value) => {
      FancyBar.configState.autoHide = value;
      if (value) {
        this.fancyBarView.setMenuBarVisible(false);
      } else {
        this.fancyBarView.setMenuBarVisible(
          FancyBar.configState.displayMenuBar
        );
      }
    });
    atom.config.observe("fancy-bar.general.hideFullscreenTitle", (value) => {
      FancyBar.configState.hideFullscreenTitle = value;
      if (atom.isFullScreen()) {
        this.fancyBarView.setTitleBarVisible(!value);
      }
    });
    atom.config.observe("fancy-bar.general.altGivesFocus", (value) => {
      FancyBar.configState.altGivesFocus = value;
    });
    atom.config.observe("fancy-bar.general.menuBarMnemonics", (value) => {
      FancyBar.configState.menuBarMnemonics = value;
    });
    atom.config.observe("fancy-bar.colors.autoSelectColor", (value) => {
      FancyBar.configState.autoSelectColor = value;
      value
        ? ThemeManager.clearCustomColors()
        : ThemeManager.applyCustomColors();
    });
    atom.config.observe("fancy-bar.colors.baseColor", (value) => {
      FancyBar.configState.baseColor = value;
      if (!FancyBar.configState.autoSelectColor && this.initialized) {
        ThemeManager.applyCustomColors();
      }
    });
    atom.config.observe("fancy-bar.colors.highlightColor", (value) => {
      FancyBar.configState.highlightColor = value;
      if (!FancyBar.configState.autoSelectColor && this.initialized) {
        ThemeManager.applyCustomColors();
      }
    });
    atom.config.observe("fancy-bar.colors.textColor", (value) => {
      FancyBar.configState.textColor = value;
      if (!FancyBar.configState.autoSelectColor && this.initialized) {
        ThemeManager.applyCustomColors();
      }
    });
    atom.config.observe("fancy-bar.colors.controlTheme", (value) => {
      FancyBar.configState.windowControlTheme = value;
      this.fancyBarView.getThemeManager().setWindowControlTheme(value);
    });
    atom.config.observe("fancy-bar.colors.controlLocation", (value) => {
      FancyBar.configState.reverseWindowControls = value;
      this.fancyBarView.getThemeManager().setReverseWindowControls(value);
    });
  }

  deactivate() {
    this.subscriptions?.dispose();
    this.fancyBarView.deactivate();
  }

  serialize() {}

  deserialize(data) {}
}

module.exports = { FancyBar };
