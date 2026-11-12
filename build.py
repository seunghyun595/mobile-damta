#!/usr/bin/env python3
"""Bundle src/ into a single self-contained page.

index.html          full document (GitHub Pages, repo root)
dist/artifact.html  body-only variant for the Artifact host (it wraps the page in its own skeleton)
"""
import pathlib, re

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
DIST.mkdir(exist_ok=True)

css = (SRC / "style.css").read_text()
body = (SRC / "body.html").read_text()
js_files = sorted((SRC / "js").glob("*.js"))
js = "\n".join(f.read_text() for f in js_files)
js = "(function(){\n'use strict';\n" + js + "\n})();"

FONTS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400&family=Noto+Sans+KR:wght@400;500;800&display=swap">'
)
TITLE = "모바일 담타"
DESC = "회사에서 몰래 피우는 한 대. 연초·전자담배, 라이터, 장소와 날씨를 고르는 풍자용 흡연 시뮬레이터."

head_common = f"""<title>{TITLE}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="{DESC}">
<meta name="theme-color" content="#050607">
{FONTS}
<style>
{css}
</style>"""

full = f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="{TITLE}">
<meta property="og:title" content="{TITLE}">
<meta property="og:description" content="{DESC}">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="manifest.webmanifest">
{head_common}
</head>
<body>
{body}
<script>
{js}
</script>
</body>
</html>
"""

artifact = f"""{head_common}
{body}
<script>
{js}
</script>
"""

(ROOT / "index.html").write_text(full)
(DIST / "artifact.html").write_text(artifact)
print("built", len(full) // 1024, "KB;", len(js_files), "js modules")
