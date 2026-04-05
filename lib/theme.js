const { controlThemes } = require("./types.js");
const { Utils } = require("./utils.js");

function resolveDefaultTheme() {
  switch (process.platform) {
    case "darwin": return "macOS Tahoe";
    case "linux":  return "GNOME";
    default:       return "Windows 11";
  }
}

class ThemeManager {
  constructor(view) {
    this.view = view;
    this.controlTheme = undefined;
  }

  setWindowControlTheme(theme) {
    const resolved = theme === "Default" ? resolveDefaultTheme() : theme;
    const newTheme = controlThemes[resolved];
    if (!newTheme) {
      return;
    }

    if (this.controlTheme) {
      this.view.getElement().classList.remove(this.controlTheme.cssClass);
    }

    this.view.getElement().classList.add(newTheme.cssClass);
    this.controlTheme = newTheme;

    // Auto-set control position based on theme
    Utils.setToggleClass(this.view.getElement(), "reverse-controls", newTheme.reverseControls);
  }
}

module.exports = { ThemeManager };
