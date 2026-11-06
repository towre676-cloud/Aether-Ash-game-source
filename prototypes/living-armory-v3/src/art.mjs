/** Original generated art textures baked locally. No remote fetch, renderer or gameplay RNG. */
const ART_TYPES = new Set(['sword','spear','axe','bow','shield','crown','helm','hood','armor','robe','mantle','legs','boots','ring','relic','scepter','sigil']);
export function itemArt(icon){return ART_TYPES.has(icon)?`assets/items/${icon}.webp`:null}
