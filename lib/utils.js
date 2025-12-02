class Utils {
  static formatKeystroke(keystroke) {
    // Split by space (for multi-key sequences like "ctrl-k ctrl-d")
    return keystroke
      .split(" ")
      .map((part) =>
        part
          .split("-")
          .map((key) => key.charAt(0).toUpperCase() + key.slice(1))
          .join("-")
      )
      .join(" ");
  }

  static formatAltKey(label) {
    const m = label.match(/(?<=&)./);
    const key = m ? m[0] : null;
    const html = label.replace(`&${key}`, `<u>${key}</u>`);
    return {
      html,
      name: label.replace("&", ""),
      key: key?.toLowerCase() || null,
    };
  }

  static setToggleClass(elmnt, clazz, flag) {
    elmnt.classList.toggle(clazz, flag);
  }

  static mod(n, m) {
    return ((n % m) + m) % m;
  }

  static stopEvent(e) {
    e.stopPropagation();
    e.preventDefault();
  }

  static rangeIntersects(min0, max0, min1, max1) {
    return (
      Math.max(min0, max0) >= Math.min(min1, max1) &&
      Math.min(min0, max0) <= Math.max(min1, max1)
    );
  }

  static domRectIntersects(a, b) {
    return (
      Utils.rangeIntersects(a.x, a.x + a.width, b.x, b.x + b.width) &&
      Utils.rangeIntersects(a.y, a.y + a.height, b.y, b.y + b.height)
    );
  }
}

module.exports = { Utils };
