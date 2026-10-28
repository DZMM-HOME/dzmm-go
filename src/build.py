#!/usr/bin/env python3
"""由 src/ 下的模板生成站点文件 index.html 与 404.html（两份字节相同）。

    python3 src/build.py          # 重新生成
    python3 src/build.py --check  # 只核对：仓里的 index.html／404.html 与此刻生成的是否逐字节相同

页面是单个无外部依赖的静态 HTML：内联标志（icon.svg）、样式和脚本，页面里的 CSP 按内联内容的哈希放行。
候选名单 src/sites.txt 是 DZMM-HOME/dzmm-addr 仓 sites.txt 的逐字节副本（.github/workflows/sync-sites.yml 自动同步），
构建时写进页面，排除 src/jump.json 里本仓自己的跳转域名；页面打开时不再请求任何镜像或外部名单。
"""
import base64, hashlib, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
FQDN = re.compile(r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$")


def sha256(text: str) -> str:
    return "sha256-" + base64.b64encode(hashlib.sha256(text.encode("utf-8")).digest()).decode("ascii")


def hosts() -> list:
    jump = set(json.loads((SRC / "jump.json").read_text(encoding="utf-8"))["jump_domains"])
    names = []
    for line in (SRC / "sites.txt").read_text(encoding="utf-8").splitlines():
        name = line.split("#", 1)[0].strip().lower().rstrip(".")
        if not name:
            continue
        if not FQDN.match(name):
            raise SystemExit(f"sites.txt: 不是合法域名：{name!r}")
        if name not in jump:
            names.append(name)
    names = sorted(set(names))
    if not names:
        raise SystemExit("sites.txt: 排除跳转域名后名单为空")
    return names


def render() -> str:
    icon = (SRC / "icon.svg").read_text(encoding="utf-8").strip()
    style = (SRC / "style.css").read_text(encoding="utf-8").strip()
    script = (SRC / "redirect.js").read_text(encoding="utf-8").replace("{{HOSTS}}", json.dumps(hosts())).strip()
    html = (SRC / "template.html").read_text(encoding="utf-8")
    for key, value in (("{{ICON}}", icon), ("{{STYLE}}", style), ("{{SCRIPT}}", script),
                       ("{{STYLE_HASH}}", sha256(style)), ("{{SCRIPT_HASH}}", sha256(script))):
        html = html.replace(key, value)
    if "{{" in html:
        raise SystemExit("模板里还有没替换的占位符")
    return html


def main() -> int:
    html = render()
    targets = [ROOT / "index.html", ROOT / "404.html"]
    if "--check" in sys.argv:
        bad = [t.name for t in targets if not t.exists() or t.read_text(encoding="utf-8") != html]
        print("不一致：" + ", ".join(bad) if bad else "一致")
        return 1 if bad else 0
    for t in targets:
        t.write_text(html, encoding="utf-8")
    print("已生成", ", ".join(t.name for t in targets), f"({len(html.encode('utf-8'))} 字节)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
