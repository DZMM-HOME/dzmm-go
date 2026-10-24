#!/usr/bin/env python3
"""由 src/ 下的模板生成站点文件 index.html 与 404.html（两份字节相同）。

    python3 src/build.py          # 重新生成
    python3 src/build.py --check  # 只核对：仓里的 index.html／404.html 与此刻生成的是否逐字节相同

页面是单个无外部依赖的静态 HTML：内联标志（icon.svg）、样式和脚本，页面里的 CSP 按内联内容的哈希放行。
名单 src/pool.json 取自域名登记的 rotation_domains（排除 jump_domains 里的两个跳转域名自己）；登记里的
轮换池变了，就按新的视图改 pool.json 再重新生成。
"""
import base64, hashlib, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
FQDN = re.compile(r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$")


def sha256(text: str) -> str:
    return "sha256-" + base64.b64encode(hashlib.sha256(text.encode("utf-8")).digest()).decode("ascii")


def render() -> str:
    pool = json.loads((SRC / "pool.json").read_text(encoding="utf-8"))
    hosts, jump = pool["hosts"], pool["jump_domains"]
    if hosts != sorted(set(hosts)) or not all(FQDN.match(h) for h in hosts):
        raise SystemExit("pool.json: hosts 必须是排好序、不重复的小写域名")
    if set(hosts) & set(jump):
        raise SystemExit("pool.json: 名单里不能有跳转域名自己")
    icon = (SRC / "icon.svg").read_text(encoding="utf-8").strip()
    style = (SRC / "style.css").read_text(encoding="utf-8").strip()
    script = (SRC / "redirect.js").read_text(encoding="utf-8").replace("{{HOSTS}}", json.dumps(hosts)).strip()
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
