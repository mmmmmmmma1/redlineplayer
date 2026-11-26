"""Ports the Edgework iOS exercise library (Swift `ex(...)` calls) to JSON.

    python3 tools/port_library.py ~/projects/edgework/Edgework > src/lib/data/exercises.json

It reads Swift with a small tokenizer for the literals the library uses (strings, numbers,
booleans, `.enumCase`, arrays), never by evaluating code.
"""
import json
import re
import sys
from pathlib import Path

POSITIONAL = ["id", "name", "category", "measure", "sets", "base"]
NAMED = {"side": "perSide", "level": "level", "p": "primary", "s": "secondary", "eq": "equipment",
         "sym": None, "tags": "tags", "sum": "summary", "steps": "steps", "cues": "cues", "why": "why"}
DEFAULTS = {"perSide": False, "level": 1, "secondary": [], "equipment": [], "tags": []}
# Order of the library in Library.swift's `all`, so the JSON keeps the app's order.
FILE_ORDER = ["Library.swift", "GeneralLibrary.swift", "SkillLibrary.swift", "TrackLibrary.swift",
              "HillLibrary.swift", "WristLibrary.swift"]

TOKEN = re.compile(r'''
    (?P<ws>\s+|//[^\n]*)
  | (?P<str>"(?:\\.|[^"\\])*")
  | (?P<num>-?\d+(?:\.\d+)?)
  | (?P<enum>\.[A-Za-z_]\w*)
  | (?P<name>[A-Za-z_]\w*)
  | (?P<punct>[\[\](),:])
''', re.X)


def tokens(src, pos):
    while pos < len(src):
        m = TOKEN.match(src, pos)
        if not m:
            raise ValueError(f"Unexpected character {src[pos]!r} at {pos}")
        pos = m.end()
        if m.lastgroup != "ws":
            yield m.lastgroup, m.group(), pos


def unquote(s):
    body = s[1:-1]
    if "\\(" in body:
        raise ValueError(f"String interpolation isn't supported: {s}")
    return re.sub(r'\\(.)', lambda m: {"n": "\n", "t": "\t"}.get(m.group(1), m.group(1)), body)


class Parser:
    def __init__(self, src, pos):
        self.it = tokens(src, pos)
        self.peeked = None

    def next(self):
        if self.peeked:
            t, self.peeked = self.peeked, None
            return t
        return next(self.it)

    def peek(self):
        self.peeked = self.peeked or next(self.it)
        return self.peeked

    def expect(self, text):
        kind, val, _ = self.next()
        if val != text:
            raise ValueError(f"Expected {text!r}, got {val!r}")

    def value(self):
        kind, val, _ = self.next()
        if kind == "str":
            return unquote(val)
        if kind == "num":
            return float(val) if "." in val else int(val)
        if kind == "enum":
            return val[1:]
        if kind == "name" and val in ("true", "false"):
            return val == "true"
        if kind == "name" and val == "nil":
            return None
        if val == "[":
            items = []
            while self.peek()[1] != "]":
                items.append(self.value())
                if self.peek()[1] == ",":
                    self.next()
            self.next()
            return items
        raise ValueError(f"Unexpected {val!r}")

    def call_args(self):
        """Reads `( ... )` after `ex`. Returns (positional, named)."""
        self.expect("(")
        pos, named = [], {}
        while self.peek()[1] != ")":
            kind, val, _ = self.peek()
            label = None
            if kind == "name" and val not in ("true", "false", "nil"):
                self.next()
                self.expect(":")
                label = val
            v = self.value()
            if label:
                named[label] = v
            else:
                pos.append(v)
            if self.peek()[1] == ",":
                self.next()
        self.next()
        return pos, named


def parse_file(src):
    out = []
    for m in re.finditer(r'^(?P<indent>[ \t]*)ex\(', src, re.M):
        start = m.start() + len(m.group("indent")) + 2  # position of "("
        pos, named = Parser(src, start).call_args()
        if len(pos) != len(POSITIONAL):
            raise ValueError(f"ex() near offset {m.start()} has {len(pos)} positional arguments")
        e = dict(zip(POSITIONAL, pos))
        e.update(DEFAULTS)
        for k, v in named.items():
            if k not in NAMED:
                raise ValueError(f"Unknown argument {k!r} in {e['id']}")
            if NAMED[k]:
                e[NAMED[k]] = v
        for k in ("primary", "summary", "steps", "cues", "why"):
            if k not in e:
                raise ValueError(f"{e['id']} is missing {k}")
        out.append(e)
    return out


def port(data_dir):
    data_dir = Path(data_dir)
    files = sorted(data_dir.glob("*.swift"), key=lambda p: (FILE_ORDER.index(p.name) if p.name in FILE_ORDER else 99, p.name))
    items = []
    for p in files:
        items += parse_file(p.read_text())
    return items


if __name__ == "__main__":
    root = Path(sys.argv[1])
    items = port(root / "Data")
    ids = [e["id"] for e in items]
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        sys.exit(f"Duplicate ids: {sorted(dupes)}")
    json.dump(items, sys.stdout, indent=1, ensure_ascii=False)
    sys.stdout.write("\n")
