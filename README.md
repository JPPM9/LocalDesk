# LocalDesk

A desktop app for chatting with AI models that run on your own computer, through [Ollama](https://ollama.com). No account, no cloud, no telemetry.

> **Note on language:** LocalDesk was built in German. The app (interface, messages, and the instructions it sends to the model) is available in German and English – switch under **Settings → Appearance**; the default follows your Windows language. The project rules in `CLAUDE.md` and the `CHANGELOG.md` are still in German. This README is in English, and the e-mail setup guide exists in both languages.

## 1. Project Introduction

LocalDesk is a Windows desktop app that sits on top of a local [Ollama](https://ollama.com) server. It is meant for one person who wants to use local models for everyday work: chatting, reading their own documents, sorting mail and working on code, with the data staying on their machine.

Two rules shape the whole app:

- **Nothing leaves your PC unless you ask for it.** The only outside connections are the ones you set up yourself (a second Ollama server in your LAN, your own Google app for Gmail, the update check on GitHub). The full list is in the [privacy policy](docs/privacy.md).
- **The model never changes anything on its own.** Writing files, running commands, committing and changing mail all show a card first and wait for your click.

Status: the first release (0.1.0) is not published yet. The installer and the update button work.

## 2. Project Overview and Features

**Chat**

- Streaming answers with Markdown, code highlighting, the thinking of reasoning models and tokens per second.
- Saved history with full-text search, projects (instructions and documents that apply to every chat in the project), templates, and per-chat settings (system prompt, context length, temperature, seed, thinking).
- Several Ollama servers: this PC or another machine in your network. For a server on another machine, every tool call asks first, even reading.

**Models and status**

- Download and delete models with progress, speed and remaining time.
- Status page with GPU load, VRAM, temperature and power (NVIDIA cards, Ollama on this PC) and the models currently loaded.

**Knowledge (RAG)**

- Collections from folders and files (PDF, Word, text, Markdown, source code). Re-indexing only recalculates what changed.
- Answers cite their sources as [1], [2] and so on. A click shows the passage, "Open" opens the file.
- Needs the embedding model `qwen3-embedding:0.6b`.

**Tools (MCP)**

- A file-system server with permissions per tool. Models can read files in folders you share and, after you confirm, write to them.

**Skills**

- Instructions as `SKILL.md` files (same format as Claude skills). Turn them on by hand, preset them in projects and templates, or let the model load a fitting one itself. Add skills by dragging `.md`, `.zip` or `.skill` files onto the Skills page (several at once): LocalDesk reads and checks them first, shows a preview with a safety check, and saves only what you confirm. You can also load a skill from a GitHub link: LocalDesk fetches only the text and shows it to you first. Skills up to 60,000 characters work (LocalDesk shows the size in tokens and tells you which context length a chat needs), and text files next to the `SKILL.md` (for example `references/…`) can be read by the model when needed. A skill is plain text. It runs nothing, and scripts are never executed.

**Obsidian**

- LocalDesk writes only to its own subfolder of your vault. It keeps memories about you (the model proposes, you confirm), saves chats and summaries as notes, and can index the vault as a knowledge collection.

**E-mail (Gmail)**

- Reads Gmail directly from Google and passes mail only to your local model. Read, search, summarize and suggest labels and stars. LocalDesk can add your own labels, create new ones, rename them and set or remove stars, only after your click. It never sends, deletes or archives mail and never deletes labels. Setup needs your own Google app: [docs/email-setup.md](docs/email-setup.md) ([German version](docs/email-einrichten.md)).
- Outlook is planned (Microsoft requires an Azure directory for it).

**Code area**

- An agent works in one project folder that you pick. Reading, searching and git status/diff run freely. Editing files (with a before/after view and **Undo**), commands (PowerShell) and commits each need your click, every time. There is no push. `.git` is blocked, and so are whole drives, system folders and your whole user folder.

**App**

- Light, dark or system theme, keyboard shortcuts (**Ctrl+/** or **F1**), a per-user installer with folder choice, and an update button that checks GitHub only when you click it.

## 3. Tech Stack, APIs, and Other Resources

**Stack**

- [Electron](https://www.electronjs.org) 45, built with Electron Forge and Vite; installer with electron-builder (NSIS)
- TypeScript, React 19, React Router, Tailwind CSS 4, i18next
- SQLite through Node's built-in `node:sqlite`
- Vitest for tests, oxlint and oxfmt for linting and formatting

**Libraries worth naming**

- `react-markdown`, `remark-gfm`, `rehype-highlight` for rendering answers
- `pdfjs-dist` and `mammoth` to read PDF and Word files (in a worker thread)
- `diff` for the before/after view
- `@modelcontextprotocol/sdk` for the MCP client
- `electron-updater` for updates; the Inter font is bundled, nothing loads from the internet

**APIs and services**

- [Ollama HTTP API](https://github.com/ollama/ollama/blob/main/docs/api.md) (default `http://localhost:11434`)
- Gmail API and Google OAuth (loopback redirect with PKCE), only if you set up e-mail
- GitHub Releases, for the update check
- npm, to fetch the official MCP file-system server (`@modelcontextprotocol/server-filesystem`) with `npx`

**Inspiration**

- The navigation is inspired by [mudler/LocalAI](https://github.com/mudler/LocalAI) (MIT). The code is original, not a copy.

All third-party licenses are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and in the app under **Settings → About LocalDesk → Licenses**.

## 4. Getting Started: Setup and Running Instructions

**Requirements**

- Windows 11
- [Node.js LTS](https://nodejs.org) (tested with 24.22.1), for example `winget install OpenJS.NodeJS.LTS`
- Ollama running locally with at least one model

**Run from source**

```bash
npm install
npm start
```

`npm start` opens the app in development mode. Interface changes show up immediately. Changes to the main process need a restart (press `r` in the terminal, `q` to quit).

**Build an installer**

```bash
npm run dist
```

This creates `out/installer/LocalDesk-Setup-<version>.exe`. The installer asks for the target folder (default `%LOCALAPPDATA%\Programs\LocalDesk`, no admin rights) and adds Start menu and desktop shortcuts. The app is not code-signed, so Windows SmartScreen warns on the first start. Choose "More info → Run anyway".

**Use Ollama on another machine**

1. On that machine, set the environment variable `OLLAMA_HOST=0.0.0.0` and restart Ollama.
2. Allow incoming connections on port 11434 in its Windows firewall (private network only).
3. In LocalDesk, open **Settings → Ollama servers**, enter the IP address, click **Test**, save and select it.

**Your data**

- Chats live in one SQLite file, `%APPDATA%\LocalDesk\localdesk.db`. To back up, close the app and copy the folder.
- LocalDesk does not store mail. It keeps only the Google sign-in (encrypted with Windows, readable only by your Windows account) and the client ID of your Google app.
- With an Obsidian vault set up, memories, saved chats and summaries also live as normal notes in the vault, in LocalDesk's own subfolder (default `LocalDesk`).

**Update and release**

- Users: **Settings → About LocalDesk → Check for updates**.
- Maintainers: raise the version in `package.json`, add a `## <version> – <date>` section to `CHANGELOG.md` (it becomes the text the update button shows), commit and push, then run `npm run release` for a dry run. `npm run release -- --publish` uploads the installer and update file as a GitHub release.

**Commands**

| Command             | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `npm test`          | Run the tests (Vitest)                                     |
| `npm run typecheck` | Check all types with TypeScript                            |
| `npm run lint`      | Check code rules and formatting                            |
| `npm run lint:fix`  | Fix formatting automatically                               |
| `npm run dist`      | Build the Windows installer                                |
| `npm run make`      | Build a portable ZIP (output in `out/make`)                |
| `npm run release`   | Prepare a release (dry run); add `-- --publish` to publish |
| `npm run notices`   | Collect package licenses into `THIRD_PARTY_NOTICES.md`     |

**Project layout**

```
src/
  main/       Main process (Node): window, Ollama, database, system
  preload/    Secure bridge: provides window.api to the interface
  renderer/   Interface (React)
  shared/     Types used by both sides
```

## 5. How to Contribute and Report Issues

**Report a problem or suggest something**

- Open an issue at [github.com/JPPM9/LocalDesk/issues](https://github.com/JPPM9/LocalDesk/issues). Please include your Windows version, your LocalDesk version (Settings → About), the Ollama version and model, and the steps that lead to the problem.
- Security problems: do not post details in a public issue. Open an issue that only says you have a security report, and the maintainer will arrange a private way to receive it.

**Contribute code**

- Open an issue first for anything bigger than a small fix, so we can agree on it before you spend time.
- Read [CLAUDE.md](CLAUDE.md) (German). It holds the project rules and the reasons behind past decisions. The short version: no features nobody asked for, small focused changes, and a test for every change in behavior.
- Before you open a pull request, run `npm run lint`, `npm run typecheck` and `npm test`. All three must pass.
- Keep the privacy promise: a change that adds a new network connection must be added to [docs/privacy.md](docs/privacy.md) in the same change.

## 6. Conclusion and License

LocalDesk is a small, careful tool: local models, your own files, and a confirmation card before anything changes. It is developed in small steps and tested by running the real app.

LocalDesk is released under the [MIT License](LICENSE).
