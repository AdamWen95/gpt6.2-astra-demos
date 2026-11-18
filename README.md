# GPT6.2 Astra Demos

网页游戏与交互 Demo 合集。各游戏独立维护，根项目统一生成静态首页，并为已登记作品提供游玩入口和单 HTML 下载。当前作品清单为空，合集首页可以独立构建和预览。

## 本地运行

需要 Node.js 22.12+ 和 npm。打包合集另需系统 `tar` 命令。

```sh
npm ci
npm run dev
```

浏览器打开 `http://127.0.0.1:4173/`。`dev` 会先构建再启动本地预览。修改清单或首页后，重新运行 `npm run build` 并刷新浏览器。

| 命令 | 用途 |
| --- | --- |
| `npm run build` | 校验清单，构建已登记游戏和静态合集 `dist/` |
| `npm run preview` | 本地预览已有的 `dist/` |
| `npm run build:single` | 仅构建已登记游戏的独立 HTML |
| `npm test` | 检查清单、首页和构建行为 |
| `npm run package` | 生成静态合集归档和 SHA-256 校验文件 |

## 目录结构

```text
gpt6.2-astra-demos/
├── demos.json         # 作品清单
├── package.json       # 根命令和 npm workspaces
├── package-lock.json  # 根依赖锁文件
├── games/             # 独立游戏工作区
├── site/              # 合集页面、样式和搜索交互
├── scripts/           # 校验、构建、预览与打包
├── tests/             # 合集测试
├── downloads/         # 正式分发的单游戏文件
├── deploy/            # 静态托管模板
└── docs/              # 新增游戏与部署说明
```

构建生成 `dist/index.html`、`dist/manifest.json` 和各游戏入口。打包生成 `release/` 下的合集归档。两个目录都由构建命令管理。

[新增游戏](docs/ADDING-GAMES.md) · [构建产物与部署](docs/DEPLOYMENT.md)
