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

class FancyBarView {
  constructor(configState) {
    this.configState = configState;
    this.themeManager = new ThemeManager(this);
    [this.element, this.titleBar, this.titleElement, this.windowControls] = this.createElement();
    this.titleBarVisible = true;
    this.menuBarVisible = true;
    this.originalMenuUpdateFn = undefined;
    this.menuUpdatePending = false;

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

    // Apply compact style
    this.themeManager.setTitleBarStyle("Compact");
  }

  createElement() {
    const element = document.createElement("div");
    element.classList.add("fancy-bar");

    const titleBar = document.createElement("div");
    titleBar.classList.add("title-bar");

    const titleSpan = document.createElement("span");
    titleSpan.classList.add("custom-title");
    titleSpan.textContent = "Atom";
    titleBar.appendChild(titleSpan);

    const controlWrap = document.createElement("div");
    controlWrap.classList.add("control-wrap");
    titleBar.appendChild(controlWrap);

    const controlMinimize = document.createElement("i");
    controlMinimize.textContent = "control_minimize";
    controlMinimize.classList.add("btn-minimize");
    controlWrap.appendChild(controlMinimize);

    const controlMaximize = document.createElement("i");
    controlMaximize.textContent = "control_maximize";
    controlMaximize.classList.add("btn-maximize");
    controlWrap.appendChild(controlMaximize);

    const controlClose = document.createElement("i");
    controlClose.textContent = "control_close";
    controlClose.classList.add("btn-close");
    controlWrap.appendChild(controlClose);

    element.appendChild(titleBar);

    return [
      element,
      titleBar,
      titleSpan,
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
      this.windowControls.maximize.textContent = "control_restore";
    });

    mainWindow.on("unmaximize", () => {
      this.windowControls.maximize.textContent = "control_maximize";
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
        this.windowControls.maximize.textContent = "control_restore";
      } else {
        mainWindow.unmaximize();
        this.windowControls.maximize.textContent = "control_maximize";
      }
    });

    this.windowControls.close.addEventListener("click", () => {
      mainWindow.close();
    });

    if (mainWindow.isMaximized()) {
      this.windowControls.maximize.textContent = "control_restore";
    } else {
      this.windowControls.maximize.textContent = "control_maximize";
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
}

module.exports = { FancyBarView };
