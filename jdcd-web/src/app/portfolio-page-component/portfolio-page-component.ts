import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, DestroyRef, ElementRef, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { PortfolioIntroComponent } from '../portfolio/portfolio-intro-component/portfolio-intro-component';
import { ProjectShowcase } from '../project-showcase/project-showcase';
import { WavyTextComponent } from '../wavy-text-component/wavy-text-component';
import { AssetViewer } from '../asset-viewer/asset-viewer';
import { Footer } from '../footer/footer';

interface ProjectData {
  slug: string;
  title: string;
  subtitle: string;
  html: string;
  media: string[];
  skills: string[];
}

interface ModelData {
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  modelUrl: string;
  skills: string[];
  spanX: number;
  spanY: number;
}

@Component({
  selector: 'app-portfolio-page-component',
  imports: [PortfolioIntroComponent, ProjectShowcase, WavyTextComponent, AssetViewer, Footer],
  templateUrl: './portfolio-page-component.html',
  styleUrl: './portfolio-page-component.scss',
})
export class PortfolioPageComponent implements AfterViewInit, OnInit {
  protected isTitleVisible = signal(false);
  protected hasBeenSeen = signal(false);
  protected isReturning = signal(false);
  protected readonly titleText = 'My Projects';
  protected readonly titleLayers = this.buildLayers(16);

  private firstSeen = false;
  private hasLeftViewport = false;

  protected projects = signal<ProjectData[]>([]);
  protected models = signal<ModelData[]>([]);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const titleElement = this.el.nativeElement.querySelector('.portfolio-projects-title');
    if (!titleElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = Boolean(entry?.isIntersecting);
        this.isTitleVisible.set(isVisible);

        if (isVisible) {
          if (!this.firstSeen) {
            this.firstSeen = true;
            setTimeout(() => this.hasBeenSeen.set(true), 850);
          } else if (this.hasLeftViewport) {
            this.isReturning.set(true);
          }
        } else if (this.firstSeen) {
          this.hasLeftViewport = true;
          this.isReturning.set(false);
        }
      },
      { threshold: 0.35 },
    );

    observer.observe(titleElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  ngOnInit(): void {
    this.http.get<{ projects: ProjectData[] }>('/api/projects').subscribe(({ projects }) => {
      this.projects.set(projects);
    });

    this.http.get<{ models: ModelData[] }>('/api/models').subscribe(({ models }) => {
      this.models.set(models);
    });
  }

  private buildLayers(totalLayers: number): Array<{ depth: number; alpha: number; z: number; isFront: boolean; isBack: boolean }> {
    return Array.from({ length: totalLayers }, (_, depth) => {
      const normalizedDepth = totalLayers <= 1 ? 0 : depth / (totalLayers - 1);
      // Fade from 1.0 at front to 0.04 at back using an exponential curve
      const alpha = Math.pow(1 - normalizedDepth, 3) * 0.96 + 0.04;

      return {
        depth,
        alpha: Number(alpha.toFixed(3)),
        z: totalLayers - depth,
        isFront: depth === 0,
        isBack: depth === totalLayers - 1,
      };
    });
  }
}
