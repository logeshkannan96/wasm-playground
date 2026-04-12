# 🧪 WASM Playground

A browser-based multi-language code runner powered entirely by WebAssembly. Write and execute Python, Ruby, Lua, C, and C++ instantly — no servers, no installs, no setup.

🔗 **Live Demo:** [wasm-playground-ten.vercel.app](https://wasm-playground-ten.vercel.app)

---

## ✨ Features

- **Multi-language support** — Run Python, Ruby, Lua, C, and C++ in the browser
- **Zero backend** — Everything runs client-side via WebAssembly
- **No installation needed** — Works instantly in any modern browser
- **Fast execution** — WASM-powered runtimes run at near-native speed
- **Clean UI** — Built with Vue 3 and TypeScript for a smooth editing experience

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | Vue 3 |
| Language | TypeScript |
| Build Tool | Vite |
| Runtime | WebAssembly (WASM) |
| Deployment | Vercel |

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm

### Installation

```bash
git clone https://github.com/logeshkannan96/wasm-playground.git
cd wasm-playground
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

Output will be in the `dist/` directory.

---

## 📁 Project Structure

```
wasm-playground/
├── src/             # Vue components and TypeScript source
├── dist/            # Production build output
├── .claude/         # Claude Code configuration
├── index.html       # Entry HTML
├── vite.config.ts   # Vite configuration
├── tsconfig.json    # TypeScript configuration
└── vercel.json      # Vercel deployment config
```



Pull requests are welcome! Feel free to open an issue for bugs, feature requests, or language support suggestions.
