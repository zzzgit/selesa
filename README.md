# selesa

Sync shell and app configs across machines via GitHub Gists.

## Features

- Sync via GitHub Gists
- Supports bash, git, Helix, PowerShell, Nushell, Starship, Tig
- Automatic backups before download
- Windows 11, macOS, Linux

## Installation

Requires Node.js 22+ and npm 10+.

```bash
npm install -g selesa
```

macOS:

```bash
sudo npm install -g selesa
```

## Quick start

```bash
selesa config set --token <your-token> --gistid <your-gist-id>
selesa upload all
selesa download all
```

## Commands

```bash
selesa upload [all|bash|helix|git|powershell|nushell|starship|tig]
selesa download [all|bash|helix|git|powershell|nushell|starship|tig]

selesa config set --token <token> --gistid <gistid>
selesa config get --token|--gistid
selesa config open
selesa config reset

selesa create    # Create a private gist and save its id
selesa delete    # Delete the configured gist
selesa clean     # Clear backup directory
selesa paths     # Show local config/cache paths
```

## Configuration

Config file:

- Windows 11: %APPDATA%\selesa\config.ini
- macOS/Linux: $XDG_CONFIG_HOME/selesa/config.ini (fallback: ~/.config/selesa/config.ini)

## Development

Run tests using:

```bash
npm test
```

Linting and code quality checks:

```bash
npx eslint .
```
