const { CssUtils } = require("./css.js");
const { controlThemes, cssSelectors } = require("./types.js");
const { Utils } = require("./utils.js");

class ThemeManager {
  constructor(view) {
    this.view = view;
    this.controlTheme = undefined;
  }

  setWindowControlTheme(theme) {
    const newTheme = controlThemes[theme];
    if (!newTheme) {
      return;
    }

    if (this.controlTheme) {
      this.view.getElement().classList.remove(this.controlTheme.cssClass);
    }

    this.view.getElement().classList.add(newTheme.cssClass);
    this.controlTheme = newTheme;
  }

  setReverseWindowControls(flag) {
    Utils.setToggleClass(this.view.getElement(), "reverse-controls", flag);
  }

  static getLuminance(color) {
    // Calculate the 'y' of the YIQ color model
    let y = (color.red * 299 + color.green * 587 + color.blue * 114) / 1000;
    return y / 255;
  }

  static shadeColor(color, frac) {
    const t = frac < 0 ? 0 : 255;
    const p = frac < 0 ? frac * -1 : frac;

    return new color.constructor(
      Math.round((t - color.red) * p) + color.red,
      Math.round((t - color.green) * p) + color.green,
      Math.round((t - color.blue) * p) + color.blue,
      color.alpha
    );
  }

  static clearCustomColors() {
    cssSelectors.base.forEach((selector) => {
      CssUtils.clearRule(selector);
    });
    cssSelectors.hi.forEach((selector) => {
      CssUtils.clearRule(selector);
    });
    cssSelectors.txt.forEach((selector) => {
      CssUtils.clearRule(selector);
    });
  }

  static applyCustomColors() {
    const sheet = CssUtils.getStyleSheet();
    if (!sheet) {
      return;
    }

    const colorBase = atom.config.get("title-bar.appearance.baseColor");
    const colorHi = atom.config.get("title-bar.appearance.highlightColor");
    const colorText = atom.config.get("title-bar.appearance.textColor");

    ThemeManager.clearCustomColors();

    let factor = ThemeManager.getLuminance(colorBase) >= 0.5 ? -1 : 1;
    sheet.insertRule(
      cssSelectors.base[0] +
        "{ background-color: " +
        colorBase.toHexString() +
        " !important }",
      sheet.cssRules.length
    );
    sheet.insertRule(
      cssSelectors.base[1] +
        "{ background-color: " +
        ThemeManager.shadeColor(colorBase, -0.4 * factor).toHexString() +
        " !important }",
      sheet.cssRules.length
    );
    sheet.insertRule(
      cssSelectors.base[2] +
        "{ background-color: " +
        ThemeManager.shadeColor(colorBase, 0.1 * factor).toHexString() +
        " !important }",
      sheet.cssRules.length
    );

    sheet.insertRule(
      cssSelectors.hi[0] +
        "{ background-color: " +
        colorHi.toHexString() +
        " !important }",
      sheet.cssRules.length
    );

    factor = ThemeManager.getLuminance(colorText) >= 0.5 ? -1 : 1;
    sheet.insertRule(
      cssSelectors.txt[0] +
        "{ color: " +
        colorText.toHexString() +
        " !important }",
      sheet.cssRules.length
    );
    sheet.insertRule(
      cssSelectors.txt[1] +
        "{ color: " +
        ThemeManager.shadeColor(colorText, 0.25 * factor).toHexString() +
        " !important }",
      sheet.cssRules.length
    );
    sheet.insertRule(
      cssSelectors.txt[2] +
        "{ color: " +
        ThemeManager.shadeColor(colorText, -0.4 * factor).toHexString() +
        " !important }",
      sheet.cssRules.length
    );
  }
}

module.exports = { ThemeManager };
