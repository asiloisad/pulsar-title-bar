# title-bar

Theme-aware custom title bar with integrated menu.

![view](https://github.com/asiloisad/pulsar-title-bar/blob/master/assets/view.png?raw=true)

Fork of [title-bar-replacer](https://github.com/sindrets/atom-title-bar-replacer).

## Features

- **Custom title bar**: Window controls (minimize, maximize, close) with integrated menu bar.
- **Window control themes**: Windows 11, macOS Tahoe, and GNOME styles.
- **Automatic theming**: Detects colors from UI theme variables.
- **Keyboard navigation**: Alt key mnemonics for menu access.
- **Auto-hide menu**: Optional menu bar auto-hide.
- **Service**: Allows other packages to add custom elements to the title bar.

## Installation

To install `title-bar` search for [title-bar](https://web.pulsar-edit.dev/packages/title-bar) in the Install pane of the Pulsar settings or run `ppm install title-bar`. Alternatively, you can run `ppm install asiloisad/pulsar-title-bar` to install a package directly from the GitHub repository.

## Commands

Commands available in `atom-workspace`:

- `title-bar:toggle`: toggle title bar visibility.

## Provided Service `title-bar`

Allows other packages to add custom elements to the control area (left of window buttons).

In your `package.json`:

```json
{
  "consumedServices": {
    "title-bar": {
      "versions": {
        "^1.0.0": "consumeTitleBar"
      }
    }
  }
}
```

In your main module:

```javascript
module.exports = {
  tile: null,

  consumeTitleBar(titleBar) {
    // Create your element
    const element = document.createElement("div");
    element.innerHTML = '<button>My Button</button>';

    // Add to title bar (lower priority = appears first)
    this.tile = titleBar.addItem({ item: element, priority: 100 });
  },

  deactivate() {
    this.tile?.destroy();
  }
};
```

- `addItem({ item, priority })`: adds an element to the control tiles area. `item` is a DOM element, `priority` determines order (lower = left, higher = right). Returns a `Tile` object with `getItem()`, `getPriority()`, and `destroy()` methods.
- `getTiles()`: returns an array of all current tiles.

The service does not apply any styles to your elements. You are responsible for styling your own elements in your package's stylesheet. The container uses `display: flex` with `align-items: center`.

## Customization

The style can be adjusted according to user preferences in the `styles.less` file:

- e.g. layout variables:

```less
:root {
  --title-bar-height: 32px;           // Title bar height
  --title-bar-control-width: 46px;    // Window control button width
  --title-bar-icon-size: 24px;        // Pulsar icon size
  --title-bar-icon-margin: 8px;       // Pulsar icon left margin
}
```

- e.g. menu variables:

```less
:root {
  --title-bar-menu-font-size: 12px;       // Menu label font size
  --title-bar-menu-item-height: 28px;     // Menu item height
  --title-bar-menu-item-padding: 12px;    // Menu item horizontal padding
  --title-bar-menu-item-margin: 4px;      // Menu item margin
  --title-bar-menu-item-radius: 4px;      // Menu item border radius
  --title-bar-menu-box-radius: 8px;       // Menu dropdown border radius
  --title-bar-menu-box-min-width: 200px;  // Menu dropdown minimum width
  --title-bar-menu-label-padding: 8px;    // Menu label padding
  --title-bar-menu-label-radius: 4px;     // Menu label hover border radius
}
```

- e.g. title variables:

```less
:root {
  --title-bar-title-font-size: 12px;  // Window title font size
}
```

- e.g. transition variables:

```less
:root {
  --title-bar-transition-fast: 0.05s;    // Fast transitions (menu items)
  --title-bar-transition-normal: 0.1s;   // Normal transitions (buttons)
  --title-bar-transition-slow: 0.15s;    // Slow transitions (menu labels)
}
```

- e.g. theme colors:

```less
:root {
  // Windows 11 close button
  --title-bar-close-hover-bg: #c42b1c;
  --title-bar-close-hover-color: #fff;

  // macOS Tahoe traffic lights
  --title-bar-macos-close: #ff5f57;
  --title-bar-macos-minimize: #febc2e;
  --title-bar-macos-maximize: #28c840;
  --title-bar-macos-blurred: #ddd;

  // GNOME/Adwaita
  --title-bar-gnome-button-hover-bg: fade(@text-color, 10%);
  --title-bar-gnome-button-active-bg: fade(@text-color, 15%);
  --title-bar-gnome-close-hover-bg: #c01c28;
  --title-bar-gnome-close-hover-color: #fff;
}
```

- e.g. larger title bar:

```less
:root {
  --title-bar-height: 40px;
  --title-bar-menu-item-height: 32px;
  --title-bar-title-font-size: 14px;
}
```

## Note for `one-light-ui` and `one-dark-ui`

This built-in theme has a CSS class that may not produce the best appearance for the title-bar. To restore the default package style, add the following code to your `styles.less` file:

```less
@import 'ui-variables';
.title-bar {
  height: var(--title-bar-height);
  border-bottom: 1px solid @tool-panel-border-color;
}
```

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub — any feedback's welcome!
