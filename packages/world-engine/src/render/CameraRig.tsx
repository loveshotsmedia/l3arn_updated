/**
 * CameraRig — Sims-style angled camera (ADR-004). Students orbit/zoom within
 * a constrained band; they never reach free-look or first-person by default.
 * Replaces the ad-hoc restricted <OrbitControls> with camera-controls, which
 * additionally gives us setLookAt()/fitToBox() for cinematic transitions
 * (used by the Explore -> Mission "settle" in Phase 1 Task 12).
 */
import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import CameraControlsImpl from 'camera-controls';
import * as THREE from 'three';

CameraControlsImpl.install({ THREE });

export function CameraRig() {
  const { camera, gl, invalidate } = useThree();
  const controlsRef = useRef<CameraControlsImpl | null>(null);

  useEffect(() => {
    const controls = new CameraControlsImpl(camera, gl.domElement);

    // Sims-style constraints — mirrors the previous OrbitControls limits.
    controls.minPolarAngle = Math.PI / 6; // ~30deg — don't go to top-down
    controls.maxPolarAngle = Math.PI / 2.5; // ~72deg — don't go fully horizontal
    controls.minDistance = 8;
    controls.maxDistance = 30;
    controls.dollyToCursor = false;
    controls.draggingSmoothTime = 0.15;

    // No pan — students navigate by click-to-move, not by dragging the world.
    // ACTION values are bit flags that shift between camera-controls majors
    // (v3 inserted SCREEN_PAN), so use the enum, never numeric literals.
    // Wheel is DOLLY, not ZOOM: DOLLY moves the camera within the
    // minDistance/maxDistance band (what OrbitControls "zoom" did for a
    // perspective camera); ZOOM would change camera.zoom, ignoring the band.
    controls.mouseButtons.left = CameraControlsImpl.ACTION.NONE;
    controls.mouseButtons.right = CameraControlsImpl.ACTION.NONE;
    controls.mouseButtons.wheel = CameraControlsImpl.ACTION.DOLLY;

    controls.setLookAt(10, 10, 10, 0, 0, 0, false);
    controlsRef.current = controls;

    const onControlsChange = () => invalidate();
    controls.addEventListener('update', onControlsChange);

    return () => {
      controls.removeEventListener('update', onControlsChange);
      controls.dispose();
    };
  }, [camera, gl, invalidate]);

  useEffect(() => {
    let raf: number;
    const clock = new THREE.Clock();
    const animate = () => {
      controlsRef.current?.update(clock.getDelta());
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(raf);
  }, []);

  return null;
}
