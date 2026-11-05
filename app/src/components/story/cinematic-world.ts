import * as THREE from "three";
import { C } from "@/lib/sprites/palette";
import type { SceneDefinition } from "@/lib/sprites/scenes";
import { cinematicActorAt, cinematicCameraAt } from "@/lib/sprites/cinematic-motion";
import { cinematicSet, CINEMATIC_ORIGIN } from "@/lib/sprites/cinematic-set";
import { hash01, shakeOffset } from "@/lib/sprites/scene-fx";
import { paintMayaFrames, paintGuardFrames } from "@/lib/sprites/character-painter";
import { parseMap, visionPolygon } from "@/lib/adventure/grid";
import { buildWorld, blobShadowTexture, setWallHeight, updateConeGeometry, THEMES, WALL_H, CUTAWAY_H } from "@/lib/adventure/world";
import { makeActor, setActorAnim, tickActor, disposeActor, walkAnimFor, lightLevelAt } from "@/components/adventure/scene-actors";

/** The mission's actual world builder and sprites, directed by the film timeline. */
export function createCinematicWorld(def: SceneDefinition) {
  const set = cinematicSet(def.background);
  const grid = parseMap(set.map);
  const theme = THEMES[set.theme];
  const origin = CINEMATIC_ORIGIN;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.fog);
  scene.fog = new THREE.Fog(theme.fog, 14, 34);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const hemi = new THREE.HemisphereLight(theme.ambient, theme.fog, 2.4);
  scene.add(hemi);
  const world = buildWorld(grid, set.theme, [
    { x: 12, y: 7, color: "cool", intensity: 4, range: 9 },
    { x: 17, y: 5, color: "warm", intensity: 3, range: 8 },
  ]);
  world.group.position.set(-origin.x, 0, -origin.z);
  scene.add(world.group);
  const shadow = blobShadowTexture();
  const actors = def.actors.map((actor) => {
    const model = makeActor((animation) => actor.type === "maya"
      ? paintMayaFrames(animation, 2) : paintGuardFrames(animation, 2), shadow, C.highlight);
    model.sprite.scale.multiplyScalar(actor.scale ?? 1);
    scene.add(model.sprite, model.shadow);
    if (actor.type !== "guard") return { def: actor, model, cone: null };
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshBasicMaterial({ color: C.alertBright, transparent: true,
      opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(-origin.x, 0.035, -origin.z);
    const light = new THREE.SpotLight(C.lightWarm, 34, 7, 0.7, 0.45, 1.4);
    scene.add(mesh, light, light.target);
    return { def: actor, model, cone: { mesh, light } };
  });
  const alarm = def.background === "lab-raid" || def.background === "chase" || def.background === "boss-arena";
  const powerDown = def.audio?.find((cue) => cue.sound === "power-down");
  const doorCue = def.audio?.find((cue) => cue.sound === "door-slide");
  const captureCue = def.audio?.find((cue) => cue.sound === "captured-impact");
  const maya = def.actors.find((actor) => actor.type === "maya");
  const baseLights = world.lights.map((light) => light.intensity);
  const openDoors = new Set<string>();
  const right = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const tint = new THREE.Color();
  const red = new THREE.Color(C.dangerBright);
  const aim = new THREE.Vector3();
  const sight = new THREE.Line3();
  const point = new THREE.Vector3();
  const closest = new THREE.Vector3();
  let previousMs = 0;

  // Sparse, square particles fit the mission's pixel texture scale.
  const dustPositions = new Float32Array(70 * 3);
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dustMaterial = new THREE.PointsMaterial({ color: C.lightWash, size: 0.025,
    transparent: true, opacity: 0.22, depthWrite: false });
  scene.add(new THREE.Points(dustGeometry, dustMaterial));

  function update(timeMs: number, reducedMotion: boolean) {
    const dt = Math.max(0, Math.min(100, timeMs - previousMs));
    previousMs = timeMs;
    const t = timeMs / 1000;
    const framing = cinematicCameraAt(def, timeMs, reducedMotion);
    camera.position.set(...framing.position);
    aim.set(...framing.target);
    const shake = reducedMotion ? { x: 0, y: 0 } : shakeOffset(timeMs, def.shakes);
    camera.position.x += shake.x * 0.012;
    camera.position.y += shake.y * 0.012;
    camera.lookAt(aim);
    camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld, 0).setY(0).normalize();
    camera.getWorldDirection(forward).setY(0).normalize();

    const strobe = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 6);
    for (const light of world.alarmLights) light.intensity = alarm ? 6 + strobe * 26 : 0;
    hemi.color.set(theme.ambient);
    if (alarm) hemi.color.lerp(tint.set(C.dangerDim), 0.35 + strobe * 0.4);
    const powered = !powerDown || timeMs < powerDown.atMs;
    hemi.intensity = powered ? 2.4 : 0.5;
    world.lights.forEach((light, index) => { light.intensity = powered ? baseLights[index] : 0; });
    for (const obj of world.objects) {
      const pulse = reducedMotion ? 1 : 0.85 + 0.15 * Math.sin(t * 3 + obj.seed);
      obj.glow.emissiveIntensity = powered ? (obj.kind === "lockmaster" ? 2.6 : 1.8) * pulse : 0.05;
    }
    for (const door of world.doors) {
      const opening = doorCue ? Math.min(1, Math.max(0, (timeMs - doorCue.atMs) / 550)) : 0;
      const slam = def.background === "cell" && def.shakes?.length;
      door.openness = slam ? Math.max(0, 1 - timeMs / 220) : opening;
      door.mesh.position.copy(door.closedPos).addScaledVector(door.slide, door.openness * 0.95);
      door.mesh.visible = door.openness < 0.97;
      if (door.openness > 0.5) openDoors.add(door.id); else openDoors.delete(door.id);
    }

    for (const { def: actor, model, cone } of actors) {
      const pose = cinematicActorAt(actor, timeMs);
      const grabbing = captureCue && timeMs > captureCue.atMs - 600;
      let x = pose.x;
      let z = pose.z;
      if (grabbing && actor.type === "guard" && maya) {
        const target = cinematicActorAt(maya, timeMs);
        const amount = Math.min(1, (timeMs - captureCue.atMs + 600) / 600);
        x = THREE.MathUtils.lerp(x, target.x + 0.45, amount);
        z = THREE.MathUtils.lerp(z, target.z + 0.15, amount);
      }
      const caught = captureCue && timeMs >= captureCue.atMs && actor.type === "maya";
      const anim = caught ? "captured" : pose.moving && pose.animation.startsWith("walk")
        ? walkAnimFor(Math.sin(pose.heading), Math.cos(pose.heading), right, forward, false)
        : !pose.moving && pose.animation.startsWith("walk") ? "idle" : pose.animation;
      setActorAnim(model, anim);
      tickActor(model, dt);
      model.sprite.position.set(x, 0, z);
      model.shadow.position.set(x, 0.02, z);
      lightLevelAt(x + origin.x, z + origin.z, world.lights, tint);
      if (alarm) tint.lerp(red, 0.25 + strobe * 0.2);
      model.material.color.copy(tint);
      if (cone) {
        const angle = Math.PI / 2 - pose.heading;
        updateConeGeometry(cone.mesh.geometry, visionPolygon(grid,
          { x: x + origin.x, y: z + origin.z }, angle, 0.62, 5, openDoors, 18));
        cone.light.position.set(x, 1.45, z);
        cone.light.target.position.set(x + Math.sin(pose.heading) * 4, 0, z + Math.cos(pose.heading) * 4);
      }
    }
    // Match mission cutaways and hanging-fixture occlusion at the film's focus.
    let dirty = false;
    for (const wall of world.wallInstances) {
      const dx = wall.x - origin.x - aim.x;
      const dz = wall.z - origin.z - aim.z;
      const near = dx * forward.x + dz * forward.z < -0.6 && Math.abs(dx * right.x + dz * right.z) < 9;
      const height = near ? CUTAWAY_H : WALL_H;
      if (wall.height !== height) { setWallHeight(world.walls, wall, height); dirty = true; }
    }
    if (dirty) world.walls.instanceMatrix.needsUpdate = true;
    sight.set(camera.position, aim);
    for (const fixture of world.overhead) {
      point.copy(fixture.mesh.position).add(world.group.position);
      sight.closestPointToPoint(point, true, closest);
      fixture.mesh.visible = closest.distanceTo(point) >= 1.1;
    }
    for (let i = 0; i < 70; i++) {
      dustPositions[i * 3] = (hash01(i * 3) - 0.5) * 20;
      dustPositions[i * 3 + 1] = (hash01(i * 3 + 1) * 2.3 + (reducedMotion ? 0 : t * 0.025)) % 2.3;
      dustPositions[i * 3 + 2] = (hash01(i * 3 + 2) - 0.5) * 12;
    }
    dustGeometry.attributes.position.needsUpdate = true;
  }
  function dispose() {
    for (const { model, cone } of actors) {
      disposeActor(model);
      if (cone) { cone.mesh.geometry.dispose(); cone.mesh.material.dispose(); }
    }
    shadow.dispose(); dustGeometry.dispose(); dustMaterial.dispose(); world.dispose(); scene.clear();
  }
  return { scene, camera, update, dispose };
}
