"""MkDocs hook: fail strict builds on broken links back to the docs site itself.

Some pages link to the docs site with full URLs (https://docs.beekeeperstudio.io/...).
Most come from docs/includes/supported_databases.md, which is also copied verbatim
into the README files by .github/workflows/update-readmes.yml, so it cannot use
relative links. MkDocs treats such URLs as external and never validates them, which
is how two misspelled page slugs sat on the docs homepage for months (Oct 2026).

While pages render, the hook collects every link and image whose URL starts with
`site_url`. Once a language's pages are written it checks that each target exists in
the output directory and that any #fragment matches an element id on the target page.
Each miss is logged as a warning, which aborts the build under `strict: true`.

mkdocs-static-i18n builds each extra language with a nested build() from its own
on_post_build (priority -100). This hook's on_post_build runs first (priority 0), so
a language's links are checked as soon as it is on disk, before the next language
builds and regardless of whether that later build aborts. A link into a language that
has not been built yet is held back and checked when that language's build finishes.
"""
from __future__ import annotations

import os
import re
from urllib.parse import unquote, urlsplit

from mkdocs.plugins import get_plugin_logger

log = get_plugin_logger("check_site_links")

_URL_ATTR_RE = re.compile(r"""(?:href|src)=["']([^"']+)["']""")

# Self-links found in this run and not checked yet:
# (source file, url as written, path relative to the site root, fragment).
_pending: list[tuple[str, str, str, str]] = []
# Languages whose pages are already in the output directory.
_built: set[str] = set()


def on_pre_build(config, **kwargs):
    current, default, _ = _i18n_state(config)
    if current == default:  # the outermost build of a run (every build without i18n)
        _pending.clear()
        _built.clear()


def on_page_content(html, page, config, files, **kwargs):
    for url in _URL_ATTR_RE.findall(html):
        target = _site_relative_target(url, config.site_url)
        if target is not None:
            entry = (page.file.src_uri, url, *target)
            if entry not in _pending:
                _pending.append(entry)
    return html


def on_post_build(config, **kwargs):
    current, default, languages = _i18n_state(config)
    if current:
        _built.add(current)

    held_back = []
    for entry in _pending:
        src_uri, url, path, fragment = entry
        lang = path.split("/", 1)[0]
        if lang in languages and lang != default and lang not in _built:
            held_back.append(entry)  # that language is built later in this run
            continue
        problem = _check_target(path, fragment, config.site_dir)
        if problem:
            log.warning(f"Doc file '{src_uri}' links to '{url}', but {problem}.")
    _pending[:] = held_back


def _i18n_state(config) -> tuple[str | None, str | None, set[str]]:
    """(language just built, default language, languages built in this run), from mkdocs-static-i18n."""
    i18n = config.plugins.get("i18n")
    if i18n is None:
        return None, None, set()
    return i18n.current_language, i18n.default_language, set(i18n.build_languages)


def _site_relative_target(url: str, site_url: str | None) -> tuple[str, str] | None:
    """Return (path, fragment) for a URL under site_url, or None for any other URL."""
    if not site_url:
        return None
    site = urlsplit(site_url.rstrip("/") + "/")
    link = urlsplit(url)
    if link.scheme not in ("http", "https") or link.netloc.lower() != site.netloc.lower():
        return None
    if not link.path.startswith(site.path):
        return None
    return unquote(link.path[len(site.path):]), unquote(link.fragment)


def _check_target(path: str, fragment: str, site_dir: str) -> str | None:
    """Return what is wrong with the link target, or None if it is fine."""
    site_dir = os.path.abspath(site_dir)
    target = os.path.normpath(os.path.join(site_dir, path))
    if target != site_dir and not target.startswith(site_dir + os.sep):
        return "that path points outside the built site"

    if os.path.isdir(target):
        page_file = os.path.join(target, "index.html")
        if not os.path.isfile(page_file):
            return "there is no page at that path in the built site"
    elif os.path.isfile(target):
        page_file = target if target.endswith(".html") else None
    elif os.path.isfile(target + ".html"):
        page_file = target + ".html"
    else:
        return "there is no page or file at that path in the built site"

    if fragment and page_file:
        with open(page_file, encoding="utf-8") as f:
            html = f.read()
        if not re.search(r"""(?:id|name)=["']%s["']""" % re.escape(fragment), html):
            return f"that page has no element with id '{fragment}'"
    return None
