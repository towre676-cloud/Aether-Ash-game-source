import importlib.util
import tempfile
import unittest
from pathlib import Path

SCRIPT=Path(__file__).resolve().parents[1]/'INSTALL_ENVIRONMENT_ART.py'
spec=importlib.util.spec_from_file_location('aa_art_installer',SCRIPT)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.context=tempfile.TemporaryDirectory()
        self.root=Path(self.context.name)
        (self.root/'index.html').write_text('<html><body>real game</body></html>')
        (self.root/'src').mkdir()
        (self.root/'src'/'game.mjs').write_text('export const game=1;')
        self.original=(self.root/'src'/'game.mjs').read_bytes()
    def tearDown(self):self.context.cleanup()
    def plan(self):return mod.run(self.root)
    def test_reproducible_dry_run_does_not_write(self):
        one=self.plan();two=self.plan()
        self.assertEqual(one['source_fingerprint'],two['source_fingerprint'])
        self.assertEqual(one['state'],'dry_run')
        self.assertTrue(one['safe_to_apply'])
        self.assertFalse((self.root/'src/aa-env537').exists())
    def test_apply_is_additive_and_idempotent(self):
        fp=self.plan()['source_fingerprint']
        applied=mod.run(self.root,True,fp)
        self.assertEqual(applied['state'],'modules_added_not_wired')
        self.assertEqual(len(applied['written']),len(mod.FILES))
        self.assertEqual((self.root/'src/game.mjs').read_bytes(),self.original)
        fp=self.plan()['source_fingerprint']
        second=mod.run(self.root,True,fp)
        self.assertEqual(second['written'],[])
    def test_reject_stale_fingerprint(self):
        fp=self.plan()['source_fingerprint']
        (self.root/'src/game.mjs').write_text('export const game=2;')
        with self.assertRaisesRegex(ValueError,'Stale'):
            mod.run(self.root,True,fp)
        self.assertFalse((self.root/'src/aa-env537').exists())
    def test_collision_not_overwritten(self):
        folder=self.root/'src/aa-env537';folder.mkdir()
        conflict=folder/'environment-renderer.mjs';conflict.write_text('existing newer renderer')
        report=self.plan()
        self.assertEqual(len(report['collisions']),1)
        with self.assertRaisesRegex(ValueError,'Conflicting'):
            mod.run(self.root,True,report['source_fingerprint'])
        self.assertEqual(conflict.read_text(),'existing newer renderer')
    def test_symlink_not_followed(self):
        elsewhere=Path(self.context.name)/'other';elsewhere.mkdir()
        (self.root/'src/aa-env537').symlink_to(elsewhere,target_is_directory=True)
        with self.assertRaisesRegex(ValueError,'Symlink'):
            self.plan()
        self.assertEqual(list(elsewhere.iterdir()),[])
    def test_invalid_source_rejected(self):
        (self.root/'index.html').unlink()
        with self.assertRaisesRegex(ValueError,'Expected a real web'):
            self.plan()

if __name__=='__main__':unittest.main()
