// Deterministic, DOM-free action combat primitives for the canonical runtime adapter.
// This module intentionally does not change existing campaign/save formats.
export const ACTIONS = Object.freeze({
  strike: { cooldown: 0.28, damage: 12, range: 1.9, cost: 0 },
  ember: { cooldown: 3.0, damage: 24, range: 5, cost: 15 },
  arc: { cooldown: 4.0, damage: 19, range: 6, cost: 12 },
  frost: { cooldown: 5.0, damage: 17, range: 4, cost: 13 },
  guard: { cooldown: 9.0, damage: 0, range: 0, cost: 10 },
  burst: { cooldown: 12.0, damage: 38, range: 3, cost: 25 },
  dodge: { cooldown: 1.6, damage: 0, range: 0, cost: 0 }
});
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function createCombatState({ player, enemies = [], seed = 1 } = {}) {
  if (!player || !Number.isFinite(player.x) || !Number.isFinite(player.y)) throw new TypeError('player position required');
  return {
    time: 0, seed: seed >>> 0 || 1,
    player: { ...player, hp: Math.max(0, finite(player.hp, 100)), mana: Math.max(0, finite(player.mana, 100)) },
    enemies: enemies.map(e => ({ ...e, hp: Math.max(0, finite(e.hp, 20)), state: 'idle', windup: 0, recovery: 0 })),
    readyAt: {}, events: [], defeated: []
  };
}
export function random01(state) {
  state.seed = (Math.imul(1664525, state.seed) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}
export function useAction(state, name, targetId) {
  const action = ACTIONS[name];
  if (!action) return { ok: false, reason: 'unknown-action' };
  if (state.player.hp <= 0) return { ok: false, reason: 'player-defeated' };
  if (state.time + 1e-9 < (state.readyAt[name] ?? 0)) return { ok: false, reason: 'cooldown' };
  if (state.player.mana < action.cost) return { ok: false, reason: 'mana' };
  const target = state.enemies.find(e => e.id === targetId && e.hp > 0);
  if (action.damage && (!target || distance(state.player, target) > action.range)) return { ok: false, reason: 'range-or-target' };
  state.player.mana -= action.cost;
  state.readyAt[name] = state.time + action.cooldown;
  if (name === 'guard') state.player.guardedUntil = state.time + 1.8;
  if (name === 'dodge') state.player.invulnerableUntil = state.time + 0.3;
  if (target && action.damage) {
    target.hp = Math.max(0, target.hp - action.damage);
    target.state = target.hp ? 'stagger' : 'defeated';
    target.recovery = target.hp ? 0.18 : 0;
    state.events.push({ type: 'hit', targetId, action: name, damage: action.damage });
    if (!target.hp) {
      const roll = random01(state);
      const loot = roll < 0.12 ? 'rare' : roll < 0.42 ? 'uncommon' : 'common';
      state.defeated.push(target.id);
      state.events.push({ type: 'defeat', targetId, loot, xp: Math.max(1, finite(target.xp, 10)) });
    }
  }
  state.events.push({ type: 'action', action: name });
  return { ok: true };
}
export function advanceCombat(state, dt) {
  if (!Number.isFinite(dt) || dt < 0 || dt > 0.25) throw new RangeError('dt must be 0..0.25 seconds');
  state.time += dt;
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    if (enemy.recovery > 0) {
      enemy.recovery = Math.max(0, enemy.recovery - dt);
      if (!enemy.recovery) enemy.state = 'idle';
      continue;
    }
    const d = distance(enemy, state.player);
    const range = Math.max(0.4, finite(enemy.attackRange, 1.3));
    if (enemy.state === 'windup') {
      enemy.windup -= dt;
      if (enemy.windup <= 0) {
        enemy.state = 'recover';
        enemy.recovery = Math.max(0.2, finite(enemy.attackRecovery, 0.8));
        if (d <= range && state.time >= finite(state.player.invulnerableUntil, 0)) {
          const raw = Math.max(0, finite(enemy.damage, 5));
          const damage = state.time < finite(state.player.guardedUntil, 0) ? Math.ceil(raw / 2) : raw;
          state.player.hp = Math.max(0, state.player.hp - damage);
          state.events.push({ type: 'player-hit', enemyId: enemy.id, damage });
        }
      }
    } else if (d <= range) {
      enemy.state = 'windup';
      enemy.windup = Math.max(0.15, finite(enemy.attackWindup, 0.55));
      state.events.push({ type: 'telegraph', enemyId: enemy.id });
    } else {
      enemy.state = 'pursue';
      const speed = Math.max(0, Math.min(12, finite(enemy.speed, 2)));
      const step = Math.min(speed * dt, Math.max(0, d - range));
      if (d > 0) { enemy.x += (state.player.x - enemy.x) / d * step; enemy.y += (state.player.y - enemy.y) / d * step; }
    }
  }
  return state;
}
export function drainCombatEvents(state) {
  const events = state.events;
  state.events = [];
  return events;
}
export function cooldownRemaining(state, name) {
  return Math.max(0, (state.readyAt[name] ?? 0) - state.time);
}
