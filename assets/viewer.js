// ============================================
// 3D Project Viewer (GLB + STL support)
// Built on Three.js — minimal/technical theme
// ============================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

export class ProjectViewer {
  constructor(frameEl, opts = {}) {
    this.frame = frameEl;
    this.url = opts.url;
    this.autoRotate = opts.autoRotate !== false;
    this.wireframe = false;
    this.materialColor = opts.materialColor || 0xb0b4ba;
    this.hovering = false;
    this.visible = false;
    this.started = false;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.mesh = null;
    this.originalMaterials = new WeakMap();
    this.rafId = null;

    this.frame.addEventListener('mouseenter', () => { this.hovering = true; });
    this.frame.addEventListener('mouseleave', () => { this.hovering = false; });
  }

  // Lazy init when scrolled into view
  start() {
    if (this.started) return;
    this.started = true;

    const w = this.frame.clientWidth;
    const h = this.frame.clientHeight;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = null; // transparent canvas, CSS gradient shows through

    // Camera
    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.01, 5000);
    this.camera.position.set(2, 1.8, 3);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.frame.appendChild(this.renderer.domElement);

    // Lighting — three-point for engineering parts
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(4, 6, 5);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xc7d4ff, 0.45);
    fill.position.set(-5, 2, 3);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.55);
    rim.position.set(0, -3, -5);
    this.scene.add(rim);

    // Subtle hemisphere for soft gradient lighting
    const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa3b2, 0.35);
    this.scene.add(hemi);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 50;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 0.8;

    // Resize handling
    this._onResize = () => this.handleResize();
    window.addEventListener('resize', this._onResize);

    this.loadModel(this.url);
    this.animate();
  }

  loadModel(url) {
    const ext = url.split('.').pop().toLowerCase();
    const onError = (err) => {
      console.error('[viewer] failed to load', url, err);
      this.frame.classList.add('errored');
    };

    if (ext === 'glb' || ext === 'gltf') {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => this.attachModel(gltf.scene),
        undefined,
        onError
      );
    } else if (ext === 'stl') {
      const loader = new STLLoader();
      loader.load(
        url,
        (geometry) => {
          const material = new THREE.MeshStandardMaterial({
            color: this.materialColor,
            metalness: 0.65,
            roughness: 0.45,
            flatShading: false,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.geometry.computeVertexNormals();
          this.attachModel(mesh);
        },
        undefined,
        onError
      );
    } else {
      onError(new Error('unsupported format: ' + ext));
    }
  }

  attachModel(object3d) {
    this.mesh = object3d;

    // Cache original materials & ensure good defaults for engineering look
    object3d.traverse((child) => {
      if (child.isMesh) {
        if (child.material) {
          this.originalMaterials.set(child, child.material);
          // Make Fusion exports look a bit more metallic
          if (child.material.metalness !== undefined) {
            child.material.metalness = Math.max(child.material.metalness, 0.35);
            child.material.roughness = Math.min(child.material.roughness ?? 0.6, 0.55);
          }
        }
      }
    });

    this.scene.add(object3d);
    this.frameModel();
    this.frame.classList.add('loaded');
  }

  frameModel() {
    if (!this.mesh) return;
    const box = new THREE.Box3().setFromObject(this.mesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Center the model at origin
    this.mesh.position.x -= center.x;
    this.mesh.position.y -= center.y;
    this.mesh.position.z -= center.z;

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    const cameraDist = (maxDim / 2) / Math.tan(fov / 2);

    // Camera position: 3/4 view from front-right-above
    const dir = new THREE.Vector3(1, 0.7, 1.4).normalize();
    this.camera.position.copy(dir.multiplyScalar(cameraDist * 1.7));
    this.camera.lookAt(0, 0, 0);
    this.camera.near = cameraDist / 100;
    this.camera.far = cameraDist * 100;
    this.camera.updateProjectionMatrix();

    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = cameraDist * 0.5;
    this.controls.maxDistance = cameraDist * 5;
    this.controls.update();
  }

  setWireframe(enabled) {
    this.wireframe = enabled;
    if (!this.mesh) return;
    this.mesh.traverse((child) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => { m.wireframe = enabled; });
        } else {
          child.material.wireframe = enabled;
        }
      }
    });
  }

  setAutoRotate(enabled) {
    this.autoRotate = enabled;
  }

  resetView() {
    this.frameModel();
  }

  handleResize() {
    if (!this.renderer) return;
    const w = this.frame.clientWidth;
    const h = this.frame.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  animate() {
    this.rafId = requestAnimationFrame(() => this.animate());

    // Auto-rotate, pause on hover
    if (this.mesh && this.autoRotate && !this.hovering) {
      this.mesh.rotation.y += 0.005;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this._onResize);
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
  }
}

// ============================================
// Init viewers — called from main page once the
// project cards are in the DOM
// ============================================
export function initProjectViewers(projects) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const viewer = entry.target.__viewer;
        if (viewer && !viewer.started) {
          viewer.start();
          observer.unobserve(entry.target);
        }
      }
    });
  }, { rootMargin: '200px 0px', threshold: 0.01 });

  projects.forEach((proj) => {
    const card = document.querySelector(`.project-card[data-project="${proj.id}"]`);
    if (!card) return;
    const frame = card.querySelector('.viewer-frame');
    const viewer = new ProjectViewer(frame, {
      url: proj.url,
      autoRotate: true,
    });
    frame.__viewer = viewer;
    observer.observe(frame);

    // Wire up control buttons
    const rotateBtn = card.querySelector('[data-action="rotate"]');
    const wireBtn   = card.querySelector('[data-action="wireframe"]');
    const resetBtn  = card.querySelector('[data-action="reset"]');

    if (rotateBtn) {
      rotateBtn.classList.add('active');
      rotateBtn.addEventListener('click', () => {
        const next = !viewer.autoRotate;
        viewer.setAutoRotate(next);
        rotateBtn.classList.toggle('active', next);
      });
    }
    if (wireBtn) {
      wireBtn.addEventListener('click', () => {
        const next = !viewer.wireframe;
        viewer.setWireframe(next);
        wireBtn.classList.toggle('active', next);
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => viewer.resetView());
    }
  });
}
