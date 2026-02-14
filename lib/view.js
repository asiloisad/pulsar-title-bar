const { remote } = require("electron");
const { ApplicationMenu } = require("./app-menu.js");
const { Utils } = require("./utils.js");
const { ThemeManager } = require("./theme.js");
const { MenuUpdater } = require("./updater.js");
const { ContextMenuInterceptor } = require("./context-menu-interceptor.js");
const { logoStyles } = require("./types.js");
const { ControlTiles } = require("./control-tiles.js");

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
  let lastArgs = null;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        // Execute trailing call if there was one
        if (lastArgs !== null) {
          const trailingArgs = lastArgs;
          lastArgs = null;
          fn.apply(this, trailingArgs);
        }
      }, limit);
    } else {
      // Queue the latest call for trailing execution
      lastArgs = args;
    }
  };
}

class TitleBarView {
  constructor(configState) {
    this.configState = configState;
    this.themeManager = new ThemeManager(this);
    this.contextMenuInterceptor = new ContextMenuInterceptor(configState);
    [
      this.element,
      this.titleElement,
      this.windowControls,
      this.pulsarIcon,
      this.controlTilesElement,
    ] = this.createElement();
    this.controlTiles = new ControlTiles(this.controlTilesElement);
    this.titleBarVisible = true;
    this.menuBarVisible = true;
    this.originalMenuUpdateFn = undefined;
    this.menuUpdatePending = false;

    // Bind debounced/throttled methods
    this.debouncedCheckTitleCollision = debounce(() => this.checkTitleCollision(), 150);
    this.throttledMenuUpdate = throttle(() => this.updateMenuImmediate(), 100);

    this.initWindowControls();

    this.titleObserver = new MutationObserver((mutations) => {
      mutations.forEach((o) => {
        if (o.type === "childList") {
          this.setTitleText(o.target.textContent || "Atom");
        }
      });
    });

    const realTitle = document.querySelector("title");
    if (realTitle !== null) {
      this.titleObserver.observe(realTitle, { childList: true });
    }

    const menuTemplate = atom.menu.template;
    this.appMenu = ApplicationMenu.createApplicationMenu(menuTemplate, this);
    this.element.appendChild(this.appMenu.getElement());
    this.updateTitleText();

    // Create submenu portal for scroll support (must be before attachMenuUpdater)
    this.submenuPortal = document.createElement("div");
    this.submenuPortal.classList.add("app-menu-submenu-portal");
    this.element.appendChild(this.submenuPortal);

    // Move submenus to portal for scroll support
    this.appMenu.setupSubmenuPortals(this.submenuPortal);

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

    // Activate custom context menus if enabled
    if (this.configState.customContextMenus) {
      this.contextMenuInterceptor.activate();
    }
  }

  createElement() {
    const element = document.createElement("div");
    element.classList.add("title-bar");

    // Pulsar icon at leftmost position
    const pulsarIcon = document.createElement("div");
    pulsarIcon.classList.add("pulsar-icon");
    pulsarIcon.innerHTML = logoStyles.Filled;
    pulsarIcon.addEventListener("click", () => {
      atom.commands.dispatch(atom.views.getView(atom.workspace), "application:about");
    });
    element.appendChild(pulsarIcon);

    const titleSpan = document.createElement("span");
    titleSpan.classList.add("custom-title");
    titleSpan.textContent = "Atom";
    element.appendChild(titleSpan);

    // Control tiles container (for external packages to add items)
    const controlTilesWrap = document.createElement("div");
    controlTilesWrap.classList.add("control-tiles");
    element.appendChild(controlTilesWrap);

    // Window control buttons container
    const windowButtonsWrap = document.createElement("div");
    windowButtonsWrap.classList.add("window-buttons");

    const controlMinimize = document.createElement("button");
    controlMinimize.classList.add("btn-minimize");
    controlMinimize.innerHTML =
      '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor" stroke-width="1"/></svg>';
    windowButtonsWrap.appendChild(controlMinimize);

    const controlMaximize = document.createElement("button");
    controlMaximize.classList.add("btn-maximize");
    controlMaximize.innerHTML =
      '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
    windowButtonsWrap.appendChild(controlMaximize);

    const controlClose = document.createElement("button");
    controlClose.classList.add("btn-close");
    controlClose.innerHTML =
      '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0l10 10M10 0L0 10" stroke="currentColor" stroke-width="1"/></svg>';
    windowButtonsWrap.appendChild(controlClose);

    element.appendChild(windowButtonsWrap);

    return [
      element,
      titleSpan,
      {
        minimize: controlMinimize,
        maximize: controlMaximize,
        close: controlClose,
      },
      pulsarIcon,
      controlTilesWrap,
    ];
  }

  async updateTransforms() {
    this.element.querySelectorAll(".menu-box.menu-item-submenu").forEach((o) => {
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
      // Re-setup portals for any new submenu items
      if (this.submenuPortal) {
        this.appMenu.setupSubmenuPortals(this.submenuPortal);
      }
      this.updateTransforms();
      this.debouncedCheckTitleCollision();
    }
  }

  rebuildApplicationMenu() {
    this.appMenu.getElement().parentElement?.removeChild(this.appMenu.getElement());

    // Clear portal
    this.submenuPortal.innerHTML = "";

    let menuTemplate = atom.menu.template;
    this.appMenu = ApplicationMenu.createApplicationMenu(menuTemplate);
    this.element.appendChild(this.appMenu.getElement());

    // Re-setup portals
    this.appMenu.setupSubmenuPortals(this.submenuPortal);

    this.updateTransforms();
  }

  initWindowControls() {
    this.mainWindow = remote.getCurrentWindow();

    // Store listener references for cleanup
    this.windowListeners = {
      maximize: () => {
        this.windowControls.maximize.innerHTML =
          '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/><path d="M2.5 2.5V0.5h7v7h-2" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
      },
      unmaximize: () => {
        this.windowControls.maximize.innerHTML =
          '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
      },
      "enter-full-screen": () => {
        this.windowControls.maximize.classList.add("disabled");
        if (this.configState.hideFullscreenTitle) {
          this.setTitleBarVisible(false);
        }
      },
      "leave-full-screen": () => {
        this.windowControls.maximize.classList.remove("disabled");
        if (this.configState.displayTitleBar) {
          this.setTitleBarVisible(true);
        }
      },
      blur: () => {
        document.body.click();
      },
      resize: () => {
        this.debouncedCheckTitleCollision();
      },
    };

    for (const [event, listener] of Object.entries(this.windowListeners)) {
      this.mainWindow.on(event, listener);
    }

    this.windowControls.minimize.addEventListener("click", () => {
      this.mainWindow.minimize();
    });

    this.windowControls.maximize.addEventListener("click", () => {
      if (!this.mainWindow.isMaximized()) {
        this.mainWindow.maximize();
      } else {
        this.mainWindow.unmaximize();
      }
    });

    this.windowControls.close.addEventListener("click", () => {
      this.mainWindow.close();
    });

    if (this.mainWindow.isMaximized()) {
      this.windowControls.maximize.innerHTML =
        '<svg width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/><path d="M2.5 2.5V0.5h7v7h-2" fill="none" stroke="currentColor" stroke-width="1"/></svg>';
    }
  }

  setTitleBarVisible(flag) {
    this.titleBarVisible = flag;
    Utils.setToggleClass(this.element, "no-title-bar", !flag);
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
    requestAnimationFrame(() => {
      const menuRect = this.appMenu.getElement().getBoundingClientRect();
      const titleRect = this.titleElement.getBoundingClientRect();

      if (Utils.domRectIntersects(menuRect, titleRect)) {
        this.titleElement.style.visibility = "hidden";
      } else {
        this.titleElement.style.visibility = "visible";
      }
    });
  }

  deactivate() {
    this.titleObserver?.disconnect();
    this.appMenu?.destroy();
    this.element.parentElement?.removeChild(this.element);
    this.submenuPortal.parentElement?.removeChild(this.submenuPortal);
    this.detachMenuUpdater();
    this.contextMenuInterceptor.deactivate();

    // Remove mainWindow event listeners
    if (this.mainWindow && this.windowListeners) {
      for (const [event, listener] of Object.entries(this.windowListeners)) {
        this.mainWindow.removeListener(event, listener);
      }
      this.windowListeners = null;
      this.mainWindow = null;
    }
  }

  getSubmenuPortal() {
    return this.submenuPortal;
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

  getContextMenuInterceptor() {
    return this.contextMenuInterceptor;
  }

  getControlTiles() {
    return this.controlTiles;
  }

  setLogoStyle(style) {
    const svg = logoStyles[style];
    if (svg !== undefined) {
      this.pulsarIcon.innerHTML = svg;
      this.pulsarIcon.style.display = svg ? "" : "none";
    }
  }

  isTitleBarVisible() {
    return this.titleBarVisible;
  }

  isMenuBarVisible() {
    return this.menuBarVisible;
  }
}

module.exports = { TitleBarView };
