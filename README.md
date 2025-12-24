# title-bar

Theme-aware custom title bar for Pulsar.

## Installation

To install `title-bar` search for [title-bar](https://web.pulsar-edit.dev/packages/title-bar) in the Install pane of the Pulsar settings or run `ppm install title-bar`. Alternatively, you can run `ppm install asiloisad/pulsar-title-bar` to install a package directly from the GitHub repository.

## Features

- Custom title bar with window controls (minimize, maximize, close)
- Integrated application menu bar
- Multiple window control themes (Windows 11, macOS Tahoe, GNOME)
- Automatic theme color detection from UI variables
- Keyboard navigation with Alt key mnemonics
- Auto-hide menu bar option
- Service API for adding custom elements to the title bar

## Service API

The `title-bar` package provides a service that allows other packages to add custom elements to the control area (left of window buttons).

### Consuming the Service

Add to your `package.json`:

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

Then implement the consumer in your package:

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

### API Methods

#### `addItem({ item, priority })`

Adds an element to the control tiles area.

- `item` - DOM element to add
- `priority` - Number determining order (lower = left, higher = right)
- Returns a `Tile` object

#### `getTiles()`

Returns an array of all current tiles.

### Tile Object

- `getItem()` - Returns the DOM element
- `getPriority()` - Returns the priority number
- `destroy()` - Removes the tile from the title bar

### Styling

The service does not apply any styles to your elements. You are responsible for styling your own elements in your package's stylesheet. The container uses `display: flex` with `align-items: center`.

## Customization

You can customize the title bar appearance by overriding CSS custom properties in your `styles.less` file (Edit > Stylesheet or `~/.pulsar/styles.less`).

### Layout Variables

```less
:root {
  --title-bar-height: 32px;           // Title bar height
  --title-bar-control-width: 46px;    // Window control button width
  --title-bar-icon-size: 24px;        // Pulsar icon size
  --title-bar-icon-margin: 8px;       // Pulsar icon left margin
}
```

### Menu Variables

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

### Title Variables

```less
:root {
  --title-bar-title-font-size: 12px;  // Window title font size
}
```

### Transition Variables

```less
:root {
  --title-bar-transition-fast: 0.05s;    // Fast transitions (menu items)
  --title-bar-transition-normal: 0.1s;   // Normal transitions (buttons)
  --title-bar-transition-slow: 0.15s;    // Slow transitions (menu labels)
}
```

### Theme Colors

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

### Example: Larger Title Bar

```less
:root {
  --title-bar-height: 40px;
  --title-bar-menu-item-height: 32px;
  --title-bar-title-font-size: 14px;
}
```

# Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub — any feedback's welcome!

# Credits

Fork of [title-bar-replacer](https://github.com/sindrets/atom-title-bar-replacer).
