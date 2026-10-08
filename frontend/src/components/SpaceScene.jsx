import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const loader = new GLTFLoader();
const cache = new Map();
const EYE = 1.6;

function loadModel(id) {
  if (!cache.has(id)) {
    cache.set(id, loader.loadAsync(`${BACKEND}/api/3d/${id}/model.glb`).then((g) => {
      const obj = g.scene;
      const box = new THREE.Box3().setFromObject(obj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const s = 1.5 / Math.max(size.x, size.y, size.z, 1e-3);
      obj.scale.setScalar(s);
      obj.position.set(-center.x * s, -box.min.y * s, -center.z * s);
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      return obj;
    }));
  }
  return cache.get(id).then((o) => o.clone());
}

const readTransform = (h) => ({
  position: h.position.toArray().map((v) => +v.toFixed(3)),
  rotation: [h.rotation.x, h.rotation.y, h.rotation.z].map((v) => +v.toFixed(3)),
  scale: +h.scale.x.toFixed(3),
});

function buildWorld(el, ground) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  el.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0b1014");
  scene.fog = new THREE.Fog("#0b1014", 28, 70);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 200);
  camera.position.set(6, 5, 8);
  scene.add(new THREE.HemisphereLight("#e6f9ff", "#1a1f24", 1.2));
  const sun = new THREE.DirectionalLight("#ffffff", 1.8);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 });
  scene.add(sun);
  const groundMesh = new THREE.Mesh(new THREE.CircleGeometry(30, 72), new THREE.MeshStandardMaterial({ color: ground, roughness: 0.95 }));
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);
  const grid = new THREE.GridHelper(60, 60, "#00F0FF", "#3a4a50");
  grid.material.opacity = 0.16;
  grid.material.transparent = true;
  grid.position.y = 0.002;
  scene.add(grid);
  return { renderer, scene, camera, groundMesh };
}

export function SpaceScene({ items, ground, editable, selected, mode = "translate", onSelect, onTransform, explore, onExploreExit }) {
  const mount = useRef(null);
  const ctx = useRef({});
  const cb = useRef({});
  cb.current = { onSelect, onTransform, onExploreExit };

  useEffect(() => {
    const el = mount.current;
    const { renderer, scene, camera, groundMesh } = buildWorld(el, ground);
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(0, 0.6, 0);
    orbit.enableDamping = true;
    orbit.maxPolarAngle = Math.PI / 2 - 0.04;
    orbit.maxDistance = 45;
    const look = new PointerLockControls(camera, renderer.domElement);
    look.addEventListener("unlock", () => cb.current.onExploreExit && cb.current.onExploreExit());
    const holders = new Map();
    let transform = null;
    if (editable) {
      transform = new TransformControls(camera, renderer.domElement);
      transform.addEventListener("dragging-changed", (e) => {
        orbit.enabled = !e.value;
        if (!e.value && transform.object) cb.current.onTransform?.(transform.object.userData.uid, readTransform(transform.object));
      });
      scene.add(transform.getHelper());
    }
    const keys = {};
    const onKey = (e) => { keys[e.code] = e.type === "keydown"; };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);

    const ray = new THREE.Raycaster();
    let down = null;
    const onDown = (e) => { down = [e.clientX, e.clientY]; };
    const onUp = (e) => {
      if (!down || !editable || look.isLocked || transform?.dragging) return;
      if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const hit = ray.intersectObjects([...holders.values()], true)[0];
      let o = hit?.object;
      while (o && !o.userData.uid) o = o.parent;
      cb.current.onSelect?.(o ? o.userData.uid : null);
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const clock = new THREE.Clock();
    let raf;
    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.1);
      if (look.isLocked) {
        const speed = (keys.ShiftLeft ? 7 : 3.5) * dt;
        const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
        const s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
        look.moveForward(f * speed);
        look.moveRight(s * speed);
        camera.position.y = EYE;
      } else if (orbit.enabled || !editable) {
        orbit.update();
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    ctx.current = { scene, camera, orbit, look, transform, holders, groundMesh, renderer };
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      transform?.dispose();
      orbit.dispose();
      look.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [editable]); // eslint-disable-line

  useEffect(() => {
    const { scene, holders, transform } = ctx.current;
    const ids = new Set(items.map((i) => i.uid));
    for (const [uid, h] of holders) {
      if (!ids.has(uid)) {
        if (transform?.object === h) transform.detach();
        scene.remove(h);
        holders.delete(uid);
      }
    }
    items.forEach((it) => {
      let h = holders.get(it.uid);
      if (!h) {
        h = new THREE.Group();
        h.userData.uid = it.uid;
        holders.set(it.uid, h);
        scene.add(h);
        loadModel(it.model_id).then((m) => h.add(m)).catch(() => {});
      }
      if (transform?.dragging && transform.object === h) return;
      h.position.fromArray(it.position);
      h.rotation.set(...it.rotation);
      h.scale.setScalar(it.scale);
    });
  }, [items]);

  useEffect(() => { ctx.current.groundMesh.material.color.set(ground); }, [ground]);

  useEffect(() => {
    const { transform, holders } = ctx.current;
    if (!transform) return;
    const h = selected && !explore ? holders.get(selected) : null;
    if (h) transform.attach(h); else transform.detach();
    transform.setMode(mode);
    transform.showX = mode === "translate";
    transform.showZ = mode === "translate";
    transform.showY = true;
  }, [selected, mode, explore, items]);

  useEffect(() => {
    const { camera, orbit, look } = ctx.current;
    if (explore) {
      orbit.enabled = false;
      camera.position.set(0, EYE, 9);
      camera.lookAt(0, EYE, 0);
      look.lock();
    } else {
      if (look.isLocked) look.unlock();
      orbit.enabled = true;
      camera.position.set(6, 5, 8);
      orbit.target.set(0, 0.6, 0);
    }
  }, [explore]);

  return <div ref={mount} className="absolute inset-0" data-testid="space-canvas" />;
}
