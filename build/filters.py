#!/usr/bin/env python3
"""Regenerate rules.json and content.css from upstream filter lists.

Downloads the standard filter lists, then converts them into
declarativeNetRequest block rules and cosmetic (element-hiding) selectors.

Run from the repository root:  python build/filters.py
"""

import json
import re
import urllib.request

LISTS = {
    "pgl": "https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&mimetype=plaintext",
    "easylist": "https://easylist.to/easylist/easylist.txt",
    "easyprivacy": "https://easylist.to/easylist/easyprivacy.txt",
}

MAX_RULES = 28000          # Chrome static-rule limit is 30,000; stay under it.
MAX_COSMETIC = 20000

RESOURCE_TYPES = ["sub_frame", "script", "image", "xmlhttprequest", "stylesheet",
                  "object", "font", "media", "websocket", "ping", "other"]

HOSTNAME_RE = re.compile(r"^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$")

PROCEDURAL = (":has(", ":upward(", ":style(", ":remove(", ":matches-css(", ":xpath(",
    ":shadow(", ":contains(", ":matches-property(", ":watch-attr(", ":media(", "-abp-",
    ":matches-attr(", ":others(", ":min-text-length(", ":get-cookie(", ":hover", ":focus",
    ":active", ":visited")


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "adblocker-build/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "ignore").splitlines()


def domains_from_filterlist(lines):
    out = set()
    for line in lines:
        s = line.strip()
        if not s or s[0] in "![@":
            continue
        if not s.startswith("||"):
            continue
        body = s[2:].split("$", 1)[0]
        m = re.match(r"([^/^]+)", body)
        if not m:
            continue
        d = m.group(1).strip().lower().lstrip(".")
        if HOSTNAME_RE.match(d) and d.count(".") >= 1:
            out.add(d)
    return out


def cosmetic_selectors(lines):
    out = set()
    for line in lines:
        s = line.strip()
        if not s or s[0] in "![":            # keep '#' (cosmetic rules use '##')
            continue
        if not s.startswith("##"):
            continue
        sel = s[2:].strip()
        if not sel or sel[0] in "+^$%~":
            continue
        low = sel.lower()
        if any(t in low for t in PROCEDURAL):
            continue
        if any(c in sel for c in "\n\t{};\"'"):
            continue
        out.add(sel)
    return out


def main():
    print("Downloading filter lists...")
    raw = {k: fetch(v) for k, v in LISTS.items()}

    # hosts-file domains
    pgl = set()
    for line in raw["pgl"]:
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        for p in s.split()[1:]:
            d = p.lower().strip()
            if HOSTNAME_RE.match(d) and d.count(".") >= 1:
                pgl.add(d)
                break

    el = domains_from_filterlist(raw["easylist"])
    ep = domains_from_filterlist(raw["easyprivacy"])

    inter = el & ep
    el_only, ep_only = el - inter, ep - inter
    sort_key = lambda d: (len(d), d)

    final = list(pgl)
    seen = set(final)
    for d in sorted(inter, key=sort_key):
        if d not in seen:
            seen.add(d); final.append(d)

    remaining = MAX_RULES - len(final)
    half = remaining // 2
    el_pick = [d for d in sorted(el_only, key=sort_key) if d not in seen][:half]
    ep_pick = [d for d in sorted(ep_only, key=sort_key) if d not in seen][:half]

    merged = [x for pair in zip(el_pick, ep_pick) for x in pair]
    if len(el_pick) > len(ep_pick):
        merged += el_pick[len(ep_pick):]
    else:
        merged += ep_pick[len(el_pick):]

    for d in merged:
        if len(final) >= MAX_RULES:
            break
        if d not in seen:
            seen.add(d); final.append(d)

    rules = [{
        "id": i, "priority": 1, "action": {"type": "block"},
        "condition": {"urlFilter": f"||{d}", "resourceTypes": RESOURCE_TYPES}
    } for i, d in enumerate(final[:MAX_RULES], start=1)]

    payload = {
        "comment": "Ad Blocker blocklist — ads and trackers.",
        "rules": rules,
    }
    with open("rules.json", "w") as f:
        json.dump(payload, f, indent=1)

    cos = cosmetic_selectors(raw["easylist"]) | cosmetic_selectors(raw["easyprivacy"])
    cos = sorted(cos, key=lambda s: (len(s), s))[:MAX_COSMETIC]
    with open("content.css", "w", encoding="utf-8") as f:
        f.write("/* Ad Blocker — cosmetic filters */\n")
        for sel in cos:
            f.write(sel + " {\n  display: none !important;\n}\n")

    print(f"Wrote rules.json ({len(rules)} block rules) and "
          f"content.css ({len(cos)} cosmetic selectors).")


if __name__ == "__main__":
    main()
