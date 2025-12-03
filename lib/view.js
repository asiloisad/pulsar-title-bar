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
    [
      this.element,
      this.titleBar,
      this.titleElement,
      this.tilesLeft,
      this.tilesRight,
      this.windowControls,
      this.pulsarIcon,
    ] = this.createElement();
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

    // Show menu bar on Pulsar icon hover when autoHide is enabled
    this.pulsarIcon.addEventListener("mouseenter", () => {
      if (this.configState.autoHide) {
        this.setMenuBarVisible(true);
      }
    });

    atom.themes.onDidChangeActiveThemes(() => {
      this.updateTransforms();
    });
  }

  createElement() {
    const element = document.createElement("div");
    element.classList.add("title-bar-replacer");

    const titleBar = document.createElement("div");
    titleBar.classList.add("title-bar");

    // Pulsar icon at leftmost position
    const pulsarIcon = document.createElement("div");
    pulsarIcon.classList.add("pulsar-icon");
    pulsarIcon.innerHTML = `<svg viewBox="0 0 128 128" width="20" height="20">
      <circle cx="64" cy="64" r="60" fill="#662d91"/>
      <circle cx="64" cy="64" r="9.6" fill="#fff"/>
      <path d="M53.1,72.3c-.6,0-1.3.3-1.8.8-.8.8-1,1.9-.6,2.8l-5.2,2-21.4,25.5.5.5,25.5-21.4,2-5.2c.3.1.6.2,1,.2.6,0,1.3-.3,1.8-.8,1-1,1-2.6,0-3.6-.5-.5-1.1-.7-1.8-.7h0Z" fill="#fff"/>
      <path d="M49,100.3c2.4,0,5-.3,7.7-.9,9.4-2.1,18.9-7.7,27-15.8,5.4-5.4,9.8-11.6,12.7-18l-2.5-2.4-.2.5v.3c-2.9,6.1-7,12.1-12.3,17.3-7.6,7.6-16.7,12.9-25.4,14.9-6.5,1.5-12.3,1-16.7-1.5l-2.6,2.2c3.5,2.2,7.6,3.3,12.4,3.3h0Z" fill="#fff"/>
      <path d="M58.8,90.9c-3-1.7-5.3-3.4-8-5.7l-2.5,2.1c2.2,1.9,4.5,3.6,6.9,5.2.9-.3,2.8-1.1,3.6-1.6h0Z" fill="#fff"/>
      <path d="M77.8,45.6l-2,5.2c-.3-.1-.6-.2-1-.2-.6,0-1.3.3-1.8.8-1,1-1,2.6,0,3.6.5.5,1.1.8,1.8.8s1.3-.3,1.8-.8c.8-.8,1-1.9.6-2.8l5.2-2,21.4-25.5-.5-.5-25.6,21.4Z" fill="#fff"/>
      <path d="M49.5,71.2c.2-.2.3-.3.5-.4-1-2.1-1.6-4.3-1.6-6.8,0-8.6,7-15.5,15.5-15.5s4.7.6,6.8,1.6c.2-.2.3-.4.4-.5.8-.8,1.8-1.3,2.9-1.4l.4-1.1c-3.1-1.9-6.7-3-10.5-3-11.1,0-20.1,9-20.1,20.1s1.1,7.5,3,10.5l1.1-.4c.2-1.1.7-2.2,1.5-3h0Z" fill="#fff"/>
      <path d="M78.5,56.7c-.2.2-.3.3-.5.4,1,2.1,1.6,4.3,1.6,6.8,0,8.6-7,15.5-15.5,15.5s-4.7-.6-6.8-1.6c-.2.2-.3.4-.4.5-.8.8-1.8,1.3-2.9,1.4l-.4,1.1c3.1,1.9,6.7,3,10.5,3,11.1,0,20.1-9,20.1-20.1s-1.1-7.5-3-10.5l-1.1.4c-.2,1.1-.7,2.2-1.5,3h0Z" fill="#fff"/>
      <path d="M33.5,33.5c-5.4,5.4-7.1,13.6-5,23.2,1.8,7.9,6,15.9,12.1,23l2.1-2.5c-5.6-6.7-9.4-14-11.1-21.2-1.9-8.5-.5-15.7,4.1-20.2,8.8-8.8,26.6-5.5,41.5,7l2.5-2.1c-16.2-13.8-36.2-17.2-46.2-7.2Z" fill="#fff"/>
      <path d="M87.3,48.2l-2.1,2.5c12.5,14.9,15.8,32.7,7,41.5-4.1,4.1-10.7,5.7-18.2,4.5-1.4.9-2.9,1.7-4.3,2.4,3.2.8,6.2,1.3,9.1,1.3,6.3,0,11.8-2,15.6-5.9,10-10.1,6.7-30.1-7.2-46.3h0Z" fill="#fff"/>
      <path d="M71.2,28.5c-9.4,2.1-18.9,7.7-27,15.8-15.3,15.3-20.7,35.3-13.4,47l2.2-2.6c-5.8-10.5-.4-28.3,13.4-42.1,7.6-7.6,16.7-12.9,25.4-14.9,6.5-1.5,12.3-1,16.7,1.4l2.6-2.2c-5.2-3.3-12.2-4.2-20.1-2.4Z" fill="#fff"/>
      <path d="M97,36.7l-2.2,2.6c1.8,3.3,2.5,7.5,2.1,12.3,1,1.5,1.8,3,2.6,4.5,1.6-7.6.7-14.3-2.5-19.4Z" fill="#fff"/>
    </svg>`;
    pulsarIcon.addEventListener("click", () => {
      atom.commands.dispatch(atom.views.getView(atom.workspace), "application:about");
    });
    element.appendChild(pulsarIcon);

    const titleSpan = document.createElement("span");
    titleSpan.classList.add("custom-title");
    titleSpan.textContent = "Atom";
    element.appendChild(titleSpan);

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
    controlMinimize.innerHTML =
      '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor" stroke-width="1"/></svg>';
    controlWrap.appendChild(controlMinimize);

    const controlMaximize = document.createElement("button");
    controlMaximize.classList.add("btn-maximize");
    controlMaximize.innerHTML =
      '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
    controlWrap.appendChild(controlMaximize);

    const controlClose = document.createElement("button");
    controlClose.classList.add("btn-close");
    controlClose.innerHTML =
      '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" stroke-width="1"/></svg>';
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
      pulsarIcon,
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
      this.originalMenuUpdateFn?.apply(atom.menu, args);
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
      this.windowControls.maximize.innerHTML =
        '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/><path d="M2.5 2.5V0.5h7v7h-2" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
    });

    mainWindow.on("unmaximize", () => {
      this.windowControls.maximize.innerHTML =
        '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
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
      this.windowControls.maximize.innerHTML =
        '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/><path d="M2.5 2.5V0.5h7v7h-2" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
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
