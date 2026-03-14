import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, computed, DestroyRef, ElementRef, HostBinding, inject, Input, OnChanges, OnDestroy, PLATFORM_ID, signal, SimpleChanges, ViewChild } from '@angular/core';
import { SkillPreview } from '../portfolio/skill-preview/skill-preview';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SkillsDataService } from '../skills-data.service';
import { SharedRendererService } from './shared-renderer.service';
import { ActiveViewerService, MobileViewerHandle } from './active-viewer.service';

@Component({
  selector: 'app-asset-viewer',
  imports: [SkillPreview],
  templateUrl: './asset-viewer.html',
  styleUrl: './asset-viewer.scss',
})
export class AssetViewer implements AfterViewInit, OnChanges, OnDestroy, MobileViewerHandle {
  @Input() assetName = '';
  @Input({ required: true }) modelUrl = '';
  @Input() thumbnailUrl = '';
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
  private readonly sharedRenderer = inject(SharedRendererService);
  private readonly activeViewerService = inject(ActiveViewerService);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  protected readonly isMobile = this.activeViewerService.isMobile;
  //protected readonly isMobile = () => true; // Simple mobile breakpoint check; can be replaced with a more robust solution if needed
  protected visible = signal(false);
  protected loading = signal(false);
  protected active = signal(false);
  protected fullscreenOpen = signal(false);
  protected fullscreenVisible = signal(false);

  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private resizeObserver?: ResizeObserver;
  private visibilityObserver?: IntersectionObserver;
  private sceneReady = false;
  private sceneInitializing = false;
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
    if (!this.isBrowser) return;

    this.visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.visible.set(true);

          if (!this.isMobile() && !this.sceneReady) {
            void this.initScene();
            this.visibilityObserver?.disconnect();
            this.visibilityObserver = undefined;
          }
        }
      },
      { threshold: 0.15 }
    );
    this.visibilityObserver.observe(this.el.nativeElement);
    this.destroyRef.onDestroy(() => this.visibilityObserver?.disconnect());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['modelUrl'] && this.sceneReady) {
      void this.loadModel();
    }

  }

  private async initScene(): Promise<void> {
    if (!this.canvasRef || this.sceneReady || this.sceneInitializing) return;
    this.sceneInitializing = true;

    try {
      const canvas = this.canvasRef.nativeElement;

      this.scene = new THREE.Scene();
      this.scene.background = null;

      this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
      this.camera.position.set(0, 1, 4.5);

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
    } finally {
      this.sceneInitializing = false;
    }
  }

  ngOnDestroy(): void {
    this.activeViewerService.deactivate(this);
    this.visibilityObserver?.disconnect();

    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }

    this.disposeScene();
  }

  activate(): void {
    if (!this.isBrowser || this.active()) return;

    this.active.set(true);
    this.visible.set(true);
    this.scheduleSceneInit();
  }

  deactivate(): void {
    this.fullscreenVisible.set(false);
    this.fullscreenOpen.set(false);

    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }

    this.disposeScene();
    this.active.set(false);
    this.loading.set(false);
    this.activeViewerService.deactivate(this);
  }

  protected activateMobileViewer(): void {
    if (!this.isMobile()) return;

    this.activeViewerService.activate(this);
    this.activate();
  }

  private scheduleSceneInit(retries = 4): void {
    requestAnimationFrame(() => {
      if (!this.active()) return;

      if (!this.canvasRef) {
        if (retries > 0) {
          this.scheduleSceneInit(retries - 1);
        }
        return;
      }

      void this.initScene();
    });
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
    if (old) this.disposeModel(old);

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
    if (this.scene && this.camera && this.canvasRef) {
      this.sharedRenderer.render(this.scene, this.camera, this.canvasRef.nativeElement);
    }
  }

  private disposeScene(): void {
    this.controls?.dispose();
    this.controls = undefined;

    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    this.fsResizeObserver?.disconnect();
    this.fsResizeObserver = undefined;

    const currentModel = this.scene?.getObjectByName('__model__');
    if (currentModel) {
      this.disposeModel(currentModel);
    }

    this.scene = undefined;
    this.camera = undefined;
    this.sceneReady = false;
    this.sceneInitializing = false;
  }

  private disposeModel(model: THREE.Object3D): void {
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;

      mesh.geometry?.dispose();

      if (!mesh.material) {
        return;
      }

      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(material => this.disposeMaterial(material));
    });

    model.removeFromParent();
  }

  private disposeMaterial(material: THREE.Material): void {
    const materialAny = material as THREE.Material & Record<string, unknown>;

    Object.values(materialAny).forEach((value) => {
      if (value instanceof THREE.Texture) {
        value.dispose();
      }

      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item instanceof THREE.Texture) {
            item.dispose();
          }
        });
      }
    });

    material.dispose();
  }

  private resize(): void {
    if (!this.canvasRef || !this.camera) return;
    const canvas = this.canvasRef.nativeElement;
    const host = canvas.parentElement ?? canvas;
    const cssW = Math.max(1, Math.floor(host.clientWidth));
    const cssH = Math.max(1, Math.floor(host.clientHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    this.camera.aspect = cssW / cssH;
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