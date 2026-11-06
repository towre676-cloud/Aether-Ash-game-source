/** Deterministic, purely visual morphology shared by A&A WebGL and Canvas.
 * Inputs are sampled host-owned ecology; this never modifies gameplay outputs.
 * Variation is locked to world cells, not frame count or camera position.
 */
import {hash2, valueNoise, clamp} from './grass-ecology.mjs';
export function sampleFoliageAppearance(ix,iz,seed,eco={}){
  const x=Number.isFinite(eco.x)?eco.x:ix, z=Number.isFinite(eco.z)?eco.z:iz;
  const patch=valueNoise(x*.19,z*.19,seed+109);
  const crowded=valueNoise(x*.91,z*.91,seed+113);
  const a=hash2(ix,iz,seed+141), b=hash2(ix,iz,seed+142);
  const c=hash2(ix,iz,seed+143), d=hash2(ix,iz,seed+144);
  const clump=clamp(.50+.92*patch+.22*(crowded-.5),.34,1.62);
  return {
    // Morphology is correlated by patch, with leaf-level randomness inside each tuft.
    height:.64+clump*.35+.29*a,
    width:.68+.67*b,
    fan:.48+.9*c,
    lean:(d-.5)*.6,
    phase:(a*11.7+b*4.2),
    colorIndex:hash2(ix,iz,seed+145),
    bladeJitter:c,
    // Crownlets form at selected fertile sites; disturbed ground suppresses them.
    inflorescence:hash2(ix,iz,seed+146)<clamp((eco.moisture??.5)*.22+(eco.density??.5)*.12,0,.42),
    patch,
    shade:.83+.29*patch+.07*(b-.5),
  };
}
export function placementOffset(ix,iz,seed,child=0){
  if(child===0)return {x:0,z:0};
  const a=hash2(ix,iz,seed+190+child*7)*Math.PI*2;
  const r=.11+.22*hash2(ix,iz,seed+191+child*7);
  return {x:Math.cos(a)*r,z:Math.sin(a)*r};
}
