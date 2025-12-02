# title-bar

Theme-aware custom title bar for Pulsar.

## Installation

To install `title-bar` search for [title-bar](https://web.pulsar-edit.dev/packages/title-bar) in the Install pane of the Pulsar settings or run `ppm install title-bar`. Alternatively, you can run `ppm install asiloisad/pulsar-title-bar` to install a package directly from the GitHub repository.

## Features

- Custom title bar with window controls (minimize, maximize, close)
- Integrated application menu bar
- Automatic theme color detection from UI variables
- Keyboard navigation with Alt key mnemonics
- Auto-hide menu bar option
- Tile service for adding custom elements to the title bar

## Service API

Other packages can add custom elements to the title bar by consuming the `title-bar` service.

### Consuming the Service

Add this to your package's `package.json`:

```json
"consumedServices": {
  "title-bar": {
    "versions": {
      "^1.0.0": "consumeTitleBar"
    }
  }
}
```

Then implement the consumer in your main module:

```javascript
consumeTitleBar(titleBar) {
  // Add a button to the right side of the title bar
  const button = document.createElement('button');
  button.textContent = 'Click me';
  button.addEventListener('click', () => console.log('Clicked!'));

  // Higher priority = closer to the window controls
  this.tile = titleBar.addRightTile({ item: button, priority: 100 });

  // Store reference for cleanup
  return new Disposable(() => this.tile?.destroy());
}
```

### Available Methods

| Method | Description |
|--------|-------------|
| `addLeftTile({ item, priority })` | Add element to left side. Lower priority = further left. |
| `addRightTile({ item, priority })` | Add element to right side. Higher priority = closer to controls. |
| `getLeftTiles()` | Get array of all left tiles. |
| `getRightTiles()` | Get array of all right tiles. |

### Tile Object

Each tile returned has these methods:

| Method | Description |
|--------|-------------|
| `getItem()` | Returns the DOM element. |
| `getPriority()` | Returns the priority value. |
| `destroy()` | Removes the tile from the title bar. |

# Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub — any feedback's welcome!

# Credits

Fork of [title-bar-replacer](https://github.com/sindrets/atom-title-bar-replacer).
