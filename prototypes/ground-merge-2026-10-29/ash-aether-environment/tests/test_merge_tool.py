"""Isolated unit tests for the production merge mechanism."""
from pathlib import Path
import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest

SRC = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('mergetool', SRC / 'PRODUCTION_MERGE_TOOL.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class ProductionMergeTests(unittest.TestCase):
    def setUp(self):
        self.d = tempfile.TemporaryDirectory()
        self.root = Path(self.d.name)
        (self.root / 'index.html').write_text('<title>Existing A&A Game</title>')
    def tearDown(self): self.d.cleanup()
    def test_dry_run_is_read_only(self):
        a = mod.plan(self.root)
        self.assertTrue(a['safe_to_apply'])
        self.assertEqual(10,len(a['modules']))
        self.assertEqual(['index.html'], [p.name for p in self.root.iterdir()])
    def test_apply_is_additive_and_repeatable(self):
        p = mod.plan(self.root)
        args = [sys.executable,str(SRC/'PRODUCTION_MERGE_TOOL.py'),str(self.root),'--apply','--expect-fingerprint',p['fingerprint']]
        r = subprocess.run(args, capture_output=True, text=True)
        self.assertEqual(0,r.returncode,r.stderr)
        self.assertEqual('<title>Existing A&A Game</title>',(self.root/'index.html').read_text())
        self.assertEqual(10,len(json.loads(r.stdout)['applied']))
        newplan = mod.plan(self.root)
        self.assertTrue(all(e['status']=='identical' for e in newplan['modules']))
        r2 = subprocess.run(args[:-1]+[newplan['fingerprint']], capture_output=True,text=True)
        self.assertEqual(0,r2.returncode,r2.stderr)
        self.assertEqual([],json.loads(r2.stdout)['applied'])
    def test_conflicting_existing_module_refuses_all_changes(self):
        (self.root/'lib/grass').mkdir(parents=True)
        (self.root/'lib/grass/grass-renderer.mjs').write_text('production version')
        p = mod.plan(self.root)
        self.assertFalse(p['safe_to_apply'])
        r = subprocess.run([sys.executable,str(SRC/'PRODUCTION_MERGE_TOOL.py'),str(self.root),'--apply','--expect-fingerprint',p['fingerprint']],capture_output=True,text=True)
        self.assertEqual(2,r.returncode)
        self.assertFalse((self.root/'src/production-ground-adapter.mjs').exists())
    def test_stale_source_fingerprint_refuses(self):
        p=mod.plan(self.root)
        (self.root/'index.html').write_text('parallel session update')
        r=subprocess.run([sys.executable,str(SRC/'PRODUCTION_MERGE_TOOL.py'),str(self.root),'--apply','--expect-fingerprint',p['fingerprint']],capture_output=True,text=True)
        self.assertEqual(2,r.returncode)
        self.assertFalse((self.root/'lib/ground').exists())
    def test_symlinked_destination_parent_is_rejected(self):
        outside = self.root / 'outside'
        outside.mkdir()
        (self.root / 'lib').symlink_to(outside, target_is_directory=True)
        with self.assertRaises(ValueError): mod.plan(self.root)
        self.assertFalse((outside / 'ground').exists())
    def test_fingerprint_detects_content_change_with_same_mtime(self):
        p = mod.plan(self.root)
        html = self.root / 'index.html'
        before = html.stat()
        html.write_text('<title>Changed title!</title>')
        import os
        os.utime(html,ns=(before.st_atime_ns,before.st_mtime_ns))
        self.assertNotEqual(p['fingerprint'],mod.plan(self.root)['fingerprint'])
    def test_reject_lab_root_and_unrecognized_dir(self):
        with self.assertRaises(ValueError):mod.plan(SRC)
        empty = self.root/'empty'; empty.mkdir()
        with self.assertRaises(ValueError):mod.plan(empty)

if __name__=='__main__': unittest.main()
