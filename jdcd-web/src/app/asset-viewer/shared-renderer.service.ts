import { Injectable } from '@angular/core';
import * as THREE from 'three';

/**
 * Manages a single shared WebGL renderer to avoid exceeding the browser's
 * WebGL context limit (Safari ≈ 8–16 contexts).  Each AssetViewer renders
 * through this service and copies the result to its own 2D canvas.
 */
@Injectable({ providedIn: 'root' })
export class SharedRendererService {
  private renderer?: THREE.WebGLRenderer;
  private contextLost = false;

  private ensureRenderer(): THREE.WebGLRenderer | undefined {
    if (this.contextLost) return undefined;

    if (!this.renderer) {
      const canvas = document.createElement('canvas');

      canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        this.contextLost = true;
      });
      canvas.addEventListener('webglcontextrestored', () => {
        this.contextLost = false;
      });

      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
      });
      this.renderer.setPixelRatio(1);
      this.renderer.setClearColor(0x000000, 0);
    }
    return this.renderer;
  }

  render(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    targetCanvas: HTMLCanvasElement,
  ): void {
    const renderer = this.ensureRenderer();
    if (!renderer) return;

    const w = targetCanvas.width;
    const h = targetCanvas.height;
    if (w === 0 || h === 0) return;

    renderer.setSize(w, h, false);
    renderer.render(scene, camera);

    const ctx = targetCanvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(renderer.domElement, 0, 0);
    }
  }
}
