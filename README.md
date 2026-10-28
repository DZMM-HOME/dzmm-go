# dzmm-go

DZMM 中转跳转页：`gaoloverai.com`（GitHub Pages）和 `moonwharf.com`（Cloudflare Pages 项目 `dzmm-go`）打开任意路径都只显示 DZMM 标志、「请稍候」和一行提示，
浏览器后台测候选主站的 `https://www.<域名>/api/heartbeat`（只认 200、JSON、`{"message":"ok"}`、没被重定向），跳过去时 path、query、hash 原样带上：

- 上次跳去的主站记在本页的 localStorage 和 cookie（`dzmm_go_host`）里；它还在名单里就先只测它 3 次，有 1 次通就直接跳回去，3 次都不通再测其余。
- 没有记录或记录失效时，每个域名并行测 3 次，至少 2 次通才算可用，按通过那几次的平均耗时选最低的。
- 整页最长等 8 秒，到时还没结果就显示「重试」和发布页链接。

文件：

- `index.html`／`404.html`：生成物，字节相同（GitHub Pages 对不存在的路径返回 `404.html`，Cloudflare Pages 对不存在的路径回 `index.html`）。
- `src/`：模板、样式、脚本、标志和名单。`python3 src/build.py` 重新生成，`--check` 核对仓里的生成物没有被手改。
- `src/sites.txt`：DZMM-HOME/dzmm-addr 的 `sites.txt` 的逐字节副本，构建时写进页面，页面打开时不请求任何镜像或外部名单；`src/jump.json` 里本仓自己的跳转域名会被排除。
- `.github/workflows/sync-sites.yml`：dzmm-addr 的 sites.txt 有提交时（repository_dispatch）和每小时一次，拉最新的 sites.txt，不同才更新、生成、发布到两个域名并提交，提交说明写对应的 dzmm-addr 提交号。用到仓库加密设置 `CLOUDFLARE_API_TOKEN`（只含 Pages 编辑权限）与 `CLOUDFLARE_ACCOUNT_ID`。
- `CNAME`：GitHub Pages 的自定义域名（`www.gaoloverai.com`）；Cloudflare Pages 那一份只部署 `index.html`。
- 零外部依赖：标志、样式、脚本都内联，页面里的 CSP 按内联内容的哈希放行。标志来自 DZMM-WEB-MAIN 的 `public/icon.svg`。
