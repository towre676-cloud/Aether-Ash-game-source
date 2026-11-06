import importlib.util,json,sys,tempfile,unittest
from pathlib import Path
BASE=Path(__file__).resolve().parents[1];sys.path.insert(0,str(BASE))
from PRODUCTION_V8_STAGER import plan,stage,REL,SOURCE
class Stage(unittest.TestCase):
 def setUp(self):
  self.dir=tempfile.TemporaryDirectory();self.root=Path(self.dir.name);(self.root/'index.html').write_text('<html>A&A actual game placeholder</html>');(self.root/'game.js').write_text('const live=true;');self.before=(self.root/'game.js').read_bytes()
 def tearDown(self):self.dir.cleanup()
 def test_no_mutation_dryrun(self):
  p=plan(self.root);self.assertEqual(p['status'],'add');self.assertFalse((self.root/REL).exists())
 def test_additive_and_idempotent(self):
  p=plan(self.root);r=stage(self.root,p['fingerprint']);self.assertEqual(r['state'],'module_added_not_wired')
  self.assertEqual((self.root/REL).read_bytes(),SOURCE.read_bytes());self.assertEqual((self.root/'game.js').read_bytes(),self.before)
  p2=plan(self.root);self.assertEqual(stage(self.root,p2['fingerprint'])['state'],'module_identical_not_wired')
 def test_collision_no_overwrite(self):
  d=self.root/REL;d.parent.mkdir(parents=True);d.write_text('other session change')
  p=plan(self.root);self.assertEqual(p['status'],'collision')
  with self.assertRaisesRegex(ValueError,'refusing overwrite'):stage(self.root,p['fingerprint'])
  self.assertEqual(d.read_text(),'other session change')
 def test_source_changed_stale_plan(self):
  p=plan(self.root);(self.root/'game.js').write_text('a different production change')
  with self.assertRaisesRegex(ValueError,'Stale'):stage(self.root,p['fingerprint'])
 def test_rejects_symlink_destination(self):
  (self.root/'src').symlink_to(self.root,target_is_directory=True)
  with self.assertRaisesRegex(ValueError,'Symlink'):plan(self.root)
if __name__=='__main__':unittest.main()
