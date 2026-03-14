import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, computed, DestroyRef, ElementRef, HostBinding, inject, Input, OnChanges, OnDestroy, PLATFORM_ID, signal, SimpleChanges, ViewChild } from '@angular/core';
import { SkillPreview } from '../portfolio/skill-preview/skill-preview';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SkillsDataService } from '../skills-data.service';

@Component({
  selector: 'app-asset-viewer',
  imports: [SkillPreview],
  templateUrl: './asset-viewer.html',
  styleUrl: './asset-viewer.scss',
})
export class AssetViewer implements AfterViewInit, OnChanges, OnDestroy {
  @Input() assetName = '';
  @Input({ required: true }) modelUrl = '';
  @Input() skills: string[] = [];
  @Input() spanX = 1;
  @Input() spanY = 1;

  @HostBinding('style.grid-column') get gridColumn() { return `span ${this.spanX}`; }
  @HostBinding('style.grid-row') get gridRow() { return `span ${this.spanY}`; }
  @HostBinding('class.fullscreen-open') get hostFullscreenOpen() { return this.fullscreenOpen(); }

  @ViewChild('viewerCanvas')
  private readonly canvasRef?: ElementRef<HTMLCanvasElement>;

  @ViewChild('viewerShell')
  private readonly viewerShellRef?: ElementRef<HTMLDivElement>;

  @ViewChild('fullscreenShell')
  private fullscreenShellRef?: ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly skillsData = inject(SkillsDataService);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  protected visible = signal(false);
  protected loading = signal(false);
  protected fullscreenOpen = signal(false);
  protected fullscreenVisible = signal(false);

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private resizeObserver?: ResizeObserver;
  private sceneReady = false;
  private contextLost = false;
  private onContextLost = (e: Event) => { e.preventDefault(); this.contextLost = true; };
  private onContextRestored = () => { this.contextLost = false; void this.restoreAfterContextLoss(); };
  protected skillDataList = computed(() => {
    const slugs = this.skills;
    if (slugs.length === 0) {
      return [];
    }

    const slugSet = new Set(slugs);
    return this.skillsData.skills().filter(s => slugSet.has(s.slug));
  });

  private fsResizeObserver?: ResizeObserver;
  private closeTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly fadeMs = 320;
  private fullscreenTransitioning = false;

  async ngAfterViewInit(): Promise<void> {
    if (!this.isBrowser || !this.canvasRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.visible.set(true);
          observer.disconnect();
          void this.initScene();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(this.el.nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['modelUrl'] && this.sceneReady) {
      void this.loadModel();
    }

  }

  private async initScene(): Promise<void> {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;

    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
    this.camera.position.set(0, 1, 4.5);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(4, 6, 6);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x8fb6ff, 0.35);
    fill.position.set(-3, 2, -4);
    this.scene.add(fill);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = false;
    this.controls.addEventListener('change', () => this.render());
    this.controls.enableZoom = true;
    this.controls.enablePan = true;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();

    this.sceneReady = true;
    await this.loadModel();
  }

  ngOnDestroy(): void {
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }

    const canvas = this.canvasRef?.nativeElement;
    if (canvas) {
      canvas.removeEventListener('webglcontextlost', this.onContextLost);
      canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    }

    this.controls?.dispose();
    this.resizeObserver?.disconnect();
    this.fsResizeObserver?.disconnect();
    this.renderer?.forceContextLoss();
    this.renderer?.dispose();
  }

  private async restoreAfterContextLoss(): Promise<void> {
    if (!this.canvasRef || !this.sceneReady) return;
    const canvas = this.canvasRef.nativeElement;

    this.renderer?.dispose();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.resize();
    await this.loadModel();
  }

  openFullscreen(): void {
    if (this.fullscreenTransitioning || this.fullscreenOpen()) return;
    if (!this.isBrowser || !this.scene || !this.camera || !this.canvasRef) return;

    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }

    this.fullscreenTransitioning = true;

    this.fullscreenOpen.set(true);

    // Wait one tick for the fullscreen shell to render in the DOM
    requestAnimationFrame(() => {
      const canvas = this.canvasRef?.nativeElement;
      const fullscreenShell = this.fullscreenShellRef?.nativeElement;
      if (!canvas || !fullscreenShell || !this.scene || !this.camera) return;

      fullscreenShell.appendChild(canvas);
      this.controls?.dispose();
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enableDamping = false;
      this.controls.enableZoom = true;
      this.controls.enablePan = true;
      this.controls.addEventListener('change', () => this.render());

      this.fsResizeObserver?.disconnect();
      this.fsResizeObserver = new ResizeObserver(() => this.resize());
      this.fsResizeObserver.observe(fullscreenShell);
      this.resize();

      requestAnimationFrame(() => {
        this.fullscreenVisible.set(true);
        this.fullscreenTransitioning = false;
      });
    });
  }

  closeFullscreen(): void {
    if (this.fullscreenTransitioning || !this.fullscreenOpen()) return;
    this.fullscreenTransitioning = true;
    this.fullscreenVisible.set(false);
    this.closeTimeout = setTimeout(() => {
      this.fsResizeObserver?.disconnect();
      this.fsResizeObserver = undefined;

      this.fullscreenOpen.set(false);
      this.closeTimeout = null;

      requestAnimationFrame(() => {
        const canvas = this.canvasRef?.nativeElement;
        const viewerShell = this.viewerShellRef?.nativeElement;
        if (!canvas || !viewerShell) return;

        viewerShell.appendChild(canvas);
      });

      // Re-attach controls and observers for inline canvas and re-render
      if (this.canvasRef && this.camera && this.viewerShellRef) {
        this.controls?.dispose();
        this.controls = new OrbitControls(this.camera, this.canvasRef.nativeElement);
        this.controls.enableDamping = false;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.addEventListener('change', () => this.render());

        this.resizeObserver?.disconnect();
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this.viewerShellRef.nativeElement);

        this.resize();
        this.render();
      }

      this.fullscreenTransitioning = false;
    }, this.fadeMs);
  }

  closeFullscreenOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeFullscreen();
    }
  }

  private async loadModel(): Promise<void> {
    if (!this.scene || !this.camera || !this.modelUrl) return;

    // Clear previous model
    const old = this.scene.getObjectByName('__model__');
    if (old) this.scene.remove(old);

    this.loading.set(true);
    try {
      const gltf = await new GLTFLoader().loadAsync(this.modelUrl);

      const model = gltf.scene;
      model.name = '__model__';

      // Force opaque depth-correct rendering — Blender glTF exports can
      // incorrectly mark materials as transparent, breaking depth order.
      model.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach(m => {
            m.transparent = true;
            m.depthWrite = true;
            m.side = THREE.FrontSide;
          });
        }
      });

      // Center and frame
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);

      const size = Math.max(...box.getSize(new THREE.Vector3()).toArray(), 0.001);
      this.camera.position.set(0, size * 0.37, size * 1.55);
      this.controls?.target.set(0, 0, 0);
      this.controls?.update();

      this.scene.add(model);
    } catch (err) {
      console.error('Failed to load glTF model:', this.modelUrl, err);
    } finally {
      this.loading.set(false);
    }

    this.render();
  }

  private render(): void {
    if (this.contextLost) return;
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private resize(): void {
    if (!this.canvasRef || !this.renderer || !this.camera) return;
    const host = this.canvasRef.nativeElement.parentElement ?? this.canvasRef.nativeElement;
    const w = Math.max(1, Math.floor(host.clientWidth));
    const h = Math.max(1, Math.floor(host.clientHeight));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.render();
  }

  protected get displayTitle(): string {
    const explicitName = this.assetName.trim();
    if (explicitName) return explicitName;

    const fileName = this.modelUrl.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
    if (!fileName) return 'Asset Preview';

    return fileName
      .replace(/[-_]+/g, ' ')
      .trim()
      .replace(/\b\w/g, ch => ch.toUpperCase());
  }
}