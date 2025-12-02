const { remote } = require("electron");
const { ApplicationMenu } = require("./app-menu.js");
const { Utils } = require("./utils.js");
const { ThemeManager } = require("./theme.js");
const { MenuUpdater } = require("./updater.js");

// Debounce helper
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Throttle helper
function throttle(fn, limit) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

class Tile {
  constructor(item, priority, container) {
    this.item = item;
    this.priority = priority;
    this.container = container;
  }

  getItem() {
    return this.item;
  }

  getPriority() {
    return this.priority;
  }

  destroy() {
    this.item.remove();
  }
}

class TitleBarView {
  constructor(configState) {
    this.configState = configState;
    this.themeManager = new ThemeManager(this);
    [this.element, this.titleBar, this.titleElement, this.tilesLeft, this.tilesRight, this.windowControls] = this.createElement();
    this.titleBarVisible = true;
    this.menuBarVisible = true;
    this.originalMenuUpdateFn = undefined;
    this.menuUpdatePending = false;

    // Tile management
    this.leftTiles = [];
    this.rightTiles = [];

    // Bind debounced/throttled methods
    this.debouncedCheckTitleCollision = debounce(
      () => this.checkTitleCollision(),
      50
    );
    this.throttledMenuUpdate = throttle(() => this.updateMenuImmediate(), 100);

    this.initWindowControls();

    const titleObserver = new MutationObserver((mutations, self) => {
      mutations.forEach((o) => {
        if (o.type === "childList") {
          this.setTitleText(o.target.textContent || "Atom");
        }
      });
    });

    const realTitle = document.querySelector("title");
    if (realTitle !== null) {
      titleObserver.observe(realTitle, { childList: true });
    }

    const menuTemplate = atom.menu.template;
    this.appMenu = ApplicationMenu.createApplicationMenu(menuTemplate, this);
    this.element.appendChild(this.appMenu.getElement());
    this.updateTitleText();
    this.attachMenuUpdater();

    atom.themes.onDidChangeActiveThemes(() => {
      this.updateTransforms();
    });
  }

  createElement() {
    const element = document.createElement("div");
    element.classList.add("title-bar-replacer");

    const titleBar = document.createElement("div");
    titleBar.classList.add("title-bar");

    const titleSpan = document.createElement("span");
    titleSpan.classList.add("custom-title");
    titleSpan.textContent = "Atom";
    titleBar.appendChild(titleSpan);

    // Left tiles container
    const tilesLeft = document.createElement("div");
    tilesLeft.classList.add("title-bar-tiles", "tiles-left");
    titleBar.appendChild(tilesLeft);

    // Right tiles container
    const tilesRight = document.createElement("div");
    tilesRight.classList.add("title-bar-tiles", "tiles-right");
    titleBar.appendChild(tilesRight);

    const controlWrap = document.createElement("div");
    controlWrap.classList.add("control-wrap");
    titleBar.appendChild(controlWrap);

    const controlMinimize = document.createElement("button");
    controlMinimize.classList.add("btn-minimize");
    controlMinimize.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor" stroke-width="1"/></svg>';
    controlWrap.appendChild(controlMinimize);

    const controlMaximize = document.createElement("button");
    controlMaximize.classList.add("btn-maximize");
    controlMaximize.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
    controlWrap.appendChild(controlMaximize);

    const controlClose = document.createElement("button");
    controlClose.classList.add("btn-close");
    controlClose.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" stroke-width="1"/></svg>';
    controlWrap.appendChild(controlClose);

    element.appendChild(titleBar);

    return [
      element,
      titleBar,
      titleSpan,
      tilesLeft,
      tilesRight,
      {
        minimize: controlMinimize,
        maximize: controlMaximize,
        close: controlClose,
      },
    ];
  }

  async updateTransforms() {
    this.element
      .querySelectorAll(".menu-box.menu-item-submenu")
      .forEach((o) => {
        const parentRect = o.parentElement?.getBoundingClientRect();
        o.style.transform = `translate(${parentRect.width}px, -3px)`;
      });
  }

  attachMenuUpdater() {
    if (this.originalMenuUpdateFn === undefined) {
      this.originalMenuUpdateFn = atom.menu.update;
    }

    atom.menu.update = (...args) => {
      this.originalMenuUpdateFn?.apply(atom.menu, ...args);
      this.throttledMenuUpdate();
    };

    this.updateMenuImmediate();
  }

  detachMenuUpdater() {
    if (this.originalMenuUpdateFn !== undefined) {
      atom.menu.update = this.originalMenuUpdateFn;
    }
  }

  updateMenu() {
    this.throttledMenuUpdate();
  }

  updateMenuImmediate() {
    const edits = MenuUpdater.run(this.appMenu);
    if (edits > 0) {
      this.updateTransforms();
      this.debouncedCheckTitleCollision();
    }
  }

  rebuildApplicationMenu() {
    this.appMenu
      .getElement()
      .parentElement?.removeChild(this.appMenu.getElement());
    let menuTemplate = atom.menu.template;
    this.appMenu = ApplicationMenu.createApplicationMenu(menuTemplate);
    this.element.appendChild(this.appMenu.getElement());
    this.updateTransforms();
  }

  initWindowControls() {
    const mainWindow = remote.getCurrentWindow();

    mainWindow.on("maximize", () => {
      this.windowControls.maximize.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/><path d="M2.5 2.5V0.5h7v7h-2" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
    });

    mainWindow.on("unmaximize", () => {
      this.windowControls.maximize.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
    });

    mainWindow.on("enter-full-screen", () => {
      this.windowControls.maximize.classList.add("disabled");
      if (this.configState.hideFullscreenTitle) {
        this.setTitleBarVisible(false);
      }
    });

    mainWindow.on("leave-full-screen", () => {
      this.windowControls.maximize.classList.remove("disabled");
      if (this.configState.displayTitleBar) {
        this.setTitleBarVisible(true);
      }
    });

    mainWindow.on("blur", () => {
      document.body.click();
    });

    mainWindow.on("resize", () => {
      this.debouncedCheckTitleCollision();
    });

    this.windowControls.minimize.addEventListener("click", () => {
      mainWindow.minimize();
    });

    this.windowControls.maximize.addEventListener("click", () => {
      if (!mainWindow.isMaximized()) {
        mainWindow.maximize();
      } else {
        mainWindow.unmaximize();
      }
    });

    this.windowControls.close.addEventListener("click", () => {
      mainWindow.close();
    });

    if (mainWindow.isMaximized()) {
      this.windowControls.maximize.innerHTML = '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/><path d="M2.5 2.5V0.5h7v7h-2" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
    }
  }

  setTitleBarVisible(flag) {
    this.titleBarVisible = flag;
    Utils.setToggleClass(this.titleBar, "no-title-bar", !flag);
    this.debouncedCheckTitleCollision();
  }

  setMenuBarVisible(flag) {
    this.menuBarVisible = flag;
    Utils.setToggleClass(this.appMenu.getElement(), "no-menu-bar", !flag);
  }

  setTitleText(title) {
    this.titleElement.textContent = title;
    this.debouncedCheckTitleCollision();
  }

  updateTitleText() {
    const realTitle = document.querySelector("title");
    if (realTitle !== null) {
      this.titleElement.textContent = realTitle.textContent || "Atom";
      this.debouncedCheckTitleCollision();
    }
  }

  checkTitleCollision() {
    const menuRect = this.appMenu.getElement().getBoundingClientRect();
    const titleRect = this.titleElement.getBoundingClientRect();

    if (Utils.domRectIntersects(menuRect, titleRect)) {
      this.titleElement.style.visibility = "hidden";
    } else {
      this.titleElement.style.visibility = "visible";
    }
  }

  deactivate() {
    this.element.parentElement?.removeChild(this.element);
    this.detachMenuUpdater();
  }

  getConfigState() {
    return this.configState;
  }

  getThemeManager() {
    return this.themeManager;
  }

  getElement() {
    return this.element;
  }

  getApplicationMenu() {
    return this.appMenu;
  }

  isTitleBarVisible() {
    return this.titleBarVisible;
  }

  isMenuBarVisible() {
    return this.menuBarVisible;
  }

  // Tile management
  addLeftTile({ item, priority = 0 }) {
    const tile = new Tile(item, priority, this.tilesLeft);
    this.leftTiles.push(tile);
    this.leftTiles.sort((a, b) => a.priority - b.priority);
    this.renderTiles(this.tilesLeft, this.leftTiles);
    return tile;
  }

  addRightTile({ item, priority = 0 }) {
    const tile = new Tile(item, priority, this.tilesRight);
    this.rightTiles.push(tile);
    this.rightTiles.sort((a, b) => b.priority - a.priority);
    this.renderTiles(this.tilesRight, this.rightTiles);
    return tile;
  }

  renderTiles(container, tiles) {
    container.innerHTML = "";
    for (const tile of tiles) {
      container.appendChild(tile.item);
    }
  }

  getLeftTiles() {
    return this.leftTiles.slice();
  }

  getRightTiles() {
    return this.rightTiles.slice();
  }
}

module.exports = { TitleBarView };
