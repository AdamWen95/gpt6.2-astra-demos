# 新增游戏

在 `games/<id>/` 创建独立的 npm workspace。`id` 以小写字母开头，由小写字母、数字和短横线组成，长度为 2–61。游戏自行选择技术栈并在自己的 `package.json` 声明依赖，项目共用根目录的 `package-lock.json`。

1. 将游戏包的 `name` 设为 `id`，并提供 `build:single`。脚本应生成包含全部运行资源的 HTML，可在浏览器中直接离线打开，并保留第三方许可证。构建失败应以非零退出码结束。
2. 准备实际游戏画面的 PNG 预览图。确认独立 HTML 可运行后，在根目录 `demos.json` 的 `games` 数组登记游戏。
3. 在根目录运行 `npm install` 更新锁文件，执行游戏自身的测试、`npm test` 和 `npm run build`。在合集首页验证游玩、下载和搜索。单独构建某个游戏可运行 `npm run build:single --workspace=<id>`。

单条记录示例。`singleFile` 和 `preview` 都相对于该游戏的目录。

```json
{
  "id": "my-new-game",
  "title": "新游戏",
  "subtitle": "My New Game",
  "description": "实际可玩的内容简介",
  "category": "解谜",
  "tags": ["单人"],
  "controls": "按实际操作填写",
  "technology": "按实际技术栈填写",
  "singleFile": "release/my-new-game.html",
  "preview": "docs/images/preview.png",
  "accent": "mint"
}
```

`accent` 可使用 `mint`、`lilac` 或 `peach`。合集仅构建清单内的作品，并将游戏入口生成为 `dist/<id>/index.html`。各游戏保持独立运行，可按需设置自己的开发和测试脚本。
