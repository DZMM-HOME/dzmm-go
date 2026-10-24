# dzmm-go

DZMM 中转跳转页：`gaoloverai.com`（GitHub Pages）和 `qazedcx.xyz`（Cloudflare Pages）打开任意路径都只显示 DZMM 标志和「请稍候」，
浏览器后台并行请求主站派发池的 `https://www.<域名>/api/heartbeat`，第一个返回 200 且 JSON 内容为 `{"message":"ok"}` 的，
用 `location.replace` 跳过去，path、query、hash 原样带上；8 秒内全部失败才显示一行「重试」和发布页备用链接。

- `index.html`／`404.html`：生成物，字节相同（GitHub Pages 对不存在的路径返回 `404.html`，Cloudflare Pages 对不存在的路径回 `index.html`）。
- `src/`：模板、样式、脚本、标志和名单。`python3 src/build.py` 重新生成，`--check` 核对仓里的生成物没有被手改。
- `src/pool.json`：名单取自域名登记的 `rotation_domains`（排除两个跳转域名自己）。登记的轮换池变了要同步改它再生成。
- `CNAME`：GitHub Pages 的自定义域名（`www.gaoloverai.com`），上线时由 Pages 设置写入；Cloudflare Pages 那一份只部署 `index.html`。
- 零外部依赖：标志、样式、脚本都内联，页面里的 CSP 按内联内容的哈希放行。
- 标志来自 DZMM-WEB-MAIN 的 `public/icon.svg`。
