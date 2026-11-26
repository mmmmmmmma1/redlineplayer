import json
import os
import re
import unittest
from pathlib import Path

from port_library import parse_file, port

HERE = Path(__file__).parent
FIELDS = {"id", "name", "category", "measure", "sets", "base", "perSide", "level", "primary", "secondary",
          "equipment", "tags", "summary", "steps", "cues", "why"}


class ParseSample(unittest.TestCase):
    def setUp(self):
        self.items = parse_file((HERE / "fixtures" / "sample.swift").read_text())

    def test_skips_comments_and_reads_both_calls(self):
        self.assertEqual([e["id"] for e in self.items], ["jumping-jacks", "skater-bound"])

    def test_defaults(self):
        jj = self.items[0]
        self.assertEqual(jj["perSide"], False)
        self.assertEqual(jj["level"], 1)
        self.assertEqual(jj["equipment"], [])
        self.assertEqual(jj["tags"], [])
        self.assertEqual(jj["secondary"], ["abductors"])

    def test_every_field_present(self):
        for e in self.items:
            self.assertEqual(set(e), FIELDS)

    def test_named_args_enums_and_escapes(self):
        sb = self.items[1]
        self.assertEqual(sb["category"], "power")
        self.assertEqual(sb["measure"], "reps")
        self.assertEqual((sb["sets"], sb["base"], sb["perSide"], sb["level"]), (3, 8, True, 2))
        self.assertEqual(sb["equipment"], ["cones"])
        self.assertEqual(sb["tags"], ["explosive", "gameDay"])
        self.assertEqual(sb["summary"], 'Leap side to side like a "skater", it\'s springy.')
        self.assertEqual(sb["why"], "Builds lateral power, 100%.")


@unittest.skipUnless(os.environ.get("EDGEWORK_SRC"), "set EDGEWORK_SRC to the Swift app's Edgework/ folder")
class PortReal(unittest.TestCase):
    def test_count_matches_swift_and_ids_unique(self):
        src = Path(os.environ["EDGEWORK_SRC"]) / "Data"
        calls = sum(len(re.findall(r'^\s*ex\("', p.read_text(), re.M)) for p in src.glob("*.swift"))
        items = port(src)
        self.assertEqual(len(items), calls)
        self.assertEqual(len({e["id"] for e in items}), len(items))


class CommittedJson(unittest.TestCase):
    def test_committed_library_is_well_formed(self):
        items = json.loads((HERE.parent / "src" / "lib" / "data" / "exercises.json").read_text())
        self.assertGreater(len(items), 250)
        self.assertEqual(len({e["id"] for e in items}), len(items))
        for e in items:
            self.assertEqual(set(e), FIELDS)


if __name__ == "__main__":
    unittest.main()
