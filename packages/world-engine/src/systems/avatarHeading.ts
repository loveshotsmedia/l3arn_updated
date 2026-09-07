/**
 * avatarHeading — pure yaw-steering math for the player avatar.
 *
 * Convention: yaw 0 faces +z (three.js object default "toward the camera" in
 * this scene's layout), yaw PI/2 faces +x. The avatar turns toward its move
 * target by at most `maxStep` radians per call, always taking the short way
 * around the circle. Pure and deterministic — unit-tested in node, applied
 * through a ref in PlayerAvatar's frame read (render = mutation through
 * refs, spec §6.2).
 */

const EPSILON_SQ = 1e-6;

/**
 * Next yaw for an avatar at (px, pz) turning toward (tx, tz).
 *
 * @param px, pz    current position
 * @param tx, tz    target position
 * @param current   current yaw (radians)
 * @param maxStep   max radians to rotate this call (>= 0)
 * @returns the new yaw, unchanged if the target is effectively the current position
 */
export function yawToward(
  px: number,
  pz: number,
  tx: number,
  tz: number,
  current: number,
  maxStep: number,
): number {
  const dx = tx - px;
  const dz = tz - pz;
  if (dx * dx + dz * dz < EPSILON_SQ) return current;

  const target = Math.atan2(dx, dz);

  // Shortest signed angular difference in (-PI, PI]
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff <= -Math.PI) diff += Math.PI * 2;

  const step = Math.max(-maxStep, Math.min(maxStep, diff));
  let next = current + step;

  // Normalize to (-PI, PI] to keep values bounded over long sessions
  while (next > Math.PI) next -= Math.PI * 2;
  while (next <= -Math.PI) next += Math.PI * 2;
  return next;
}
