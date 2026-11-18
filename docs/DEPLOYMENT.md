# 构建产物与部署

- `npm run build` 生成 `dist/`。发布时同步该目录内的完整内容，保留游戏子目录。`manifest.json` 记录生成时间、文件大小和 SHA-256。
- `npm run package` 重新构建并在 `release/gpt6.2-astra-demos-1.0.0/` 生成 `.tar.gz` 及对应 `.sha256`。解压归档后即可托管，以包版本为准。
- `deploy/nginx.conf` 是静态托管示例。应用前按目标环境填写域名与站点根目录，并运行 `nginx -t` 校验。也可使用支持目录索引的其他静态托管服务。
- 首页使用相对链接，可以发布到站点根目录或子路径。本地可执行 `npm run preview -- --base /gpt6.2-astra-demos/` 验证子路径。
- 可以直接打开 `dist/index.html` 浏览合集，也可单独分享各游戏 HTML。浏览合集时保持 `dist/` 内的相对目录结构。

合集构建成功后才替换上次的 `dist/`。若构建失败，保留上次可用合集。若部署后需要回退，可重新部署上一份已校验的完整归档。
