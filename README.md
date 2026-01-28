# selesa

A CLI tool for configuration synchronizing implemented in JavaScript.

## Features

Selesa synchronizes shell and application configurations across machines using GitHub Gists as cloud storage. It supports multiple configuration files including `.bashrc`, `.gitconfig`, Helix editor configs, and Tig configurations.

## Installation

Requires Node.js 22+ and npm 10+. Install globally to use the `selesa` command:

```bash
sudo npm install -g selesa
```

## Usage

Selesa provides commands for pushing, pulling, and managing your configuration synchronization:

```bash
selesa push     # Upload local configs to GitHub Gist
selesa pull     # Download configs from GitHub Gist
selesa paths    # Display configuration file paths
selesa backup   # Create configuration backups
```

## Configuration

Create configuration at `~/.config/selesa/config.ini` with your GitHub token and Gist ID. The tool automatically detects configuration file locations across different operating systems.

## Features

- **Multi-platform support**: Windows 11, macOS, and Linux
- **Secure storage**: GitHub token encryption using simple XOR cipher
- **Multiple configs**: Supports bash, git, Helix editor, and Tig
- **Backup management**: Automatic backups before synchronization
- **Detailed logging**: Separate info and error logs in `~/.selesa/logs/`

## Development

Run tests using:

```bash
npm test
```

Linting and code quality checks:

```bash
npx eslint .
```
