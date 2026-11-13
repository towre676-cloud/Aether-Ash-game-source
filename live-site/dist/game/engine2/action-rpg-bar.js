/** Compact battle shortcuts, deliberately forwarding to the canonical battle commands.
 * Does not create parallel combat state or replace campaign input/save handling. */
export function mountActionBar({ root = document, onAction } = {}) {
  if (typeof onAction !== 'function') throw new TypeError('onAction required');
  const commands = root.getElementById('commands');
  if (!commands) return () => {};
  const bar = root.createElement('nav');
  bar.id = 'action-rpg-bar';
  bar.setAttribute('aria-label', 'Quick battle actions');
  const entries = [
    ['attack','⚔','Strike','1'],['mako','✦','Mako','2'],
    ['personal','✧','Personal','3'],['guard','⬡','Guard','4'],
    ['item','▣','Supply','5'],['retreat','↩','Retreat','6']
  ];
  for (const [id,glyph,label,key] of entries) {
    const button = root.createElement('button');
    button.type = 'button';
    button.dataset.action = id;
    button.className = 'action-rpg-slot';
    button.title = label + ' (' + key + ')';
    button.setAttribute('aria-label',label + ' shortcut ' + key);
    button.innerHTML = '<span aria-hidden="true">'+glyph+'</span><small>'+key+'</small>';
    button.addEventListener('click', () => onAction(id));
    bar.append(button);
  }
  commands.append(bar);
  commands.classList.add('action-rpg-mounted');
  // Preserve canonical button availability and expose it in the quick slots.
  const sync = () => {
    for (const [id] of entries) {
      const source = root.getElementById('cmd-' + id);
      const slot = bar.querySelector('[data-action="' + id + '"]');
      if (!source || !slot) continue;
      slot.disabled = source.disabled;
      slot.setAttribute('aria-disabled', String(source.disabled));
    }
  };
  const observer = typeof MutationObserver !== 'undefined'
    ? new MutationObserver(sync) : null;
  for (const [id] of entries) {
    const source = root.getElementById('cmd-' + id);
    if (source && observer) observer.observe(source, {attributes:true,attributeFilter:['disabled']});
  }
  sync();
  const style=root.createElement('style');
  style.id='action-rpg-bar-style';
  style.textContent=`
#commands.action-rpg-mounted .command-grid{display:none}\n#action-rpg-bar{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;margin:8px auto 0;max-width:440px}
#action-rpg-bar .action-rpg-slot{min-width:0;min-height:48px;position:relative;display:grid;place-items:center;background:linear-gradient(155deg,#30404b,#111c28);color:#f3e4c5;border:1px solid #9b8663;border-radius:8px;box-shadow:inset 0 1px #ffffff28;cursor:pointer;touch-action:manipulation}
#action-rpg-bar .action-rpg-slot span{font-size:23px;line-height:1}
#action-rpg-bar .action-rpg-slot small{position:absolute;bottom:1px;right:4px;font:10px system-ui;color:#d3c5a6}
#action-rpg-bar .action-rpg-slot:disabled{opacity:.4;cursor:not-allowed}\n#action-rpg-bar .action-rpg-slot:focus-visible{outline:3px solid #f4cb75;outline-offset:2px}
@media(max-width:600px){#action-rpg-bar{gap:3px}#action-rpg-bar .action-rpg-slot{min-height:42px}#action-rpg-bar .action-rpg-slot span{font-size:20px}}
@media(prefers-reduced-motion:reduce){#action-rpg-bar *{transition:none!important;animation:none!important}}
`;
  root.head.append(style);
  const keydown = e => {
    if (commands.hidden || root.getElementById('pause')?.hidden === false || root.getElementById('dialog')?.hidden === false || root.getElementById('spell-menu')?.hidden === false || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
    const entry=entries.find(row=>row[3]===e.key);
    if (!entry) return;
    const source = root.getElementById('cmd-' + entry[0]);
    if (!source || source.disabled) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    onAction(entry[0]);
  };
  root.addEventListener('keydown',keydown,true);
  return () => {observer?.disconnect();root.removeEventListener('keydown',keydown,true);commands.classList.remove('action-rpg-mounted');bar.remove();style.remove();};
}
