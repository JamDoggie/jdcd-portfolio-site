import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewChild } from '@angular/core';
import { PortfolioIntroComponent } from '../portfolio/portfolio-intro-component/portfolio-intro-component';
import { ProjectShowcase } from '../project-showcase/project-showcase';

interface ProjectData {
  slug: string;
  title: string;
  subtitle: string;
  html: string;
  media: string[];
  skills: string[];
}

@Component({
  selector: 'app-portfolio-page-component',
  imports: [PortfolioIntroComponent, ProjectShowcase],
  templateUrl: './portfolio-page-component.html',
  styleUrl: './portfolio-page-component.scss',
})
export class PortfolioPageComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('projectsTitle')
  private readonly projectsTitle?: ElementRef<HTMLElement>;

  protected isTitleVisible = false;
  protected readonly titleText = 'My Projects';
  protected readonly titleLayers = this.buildLayers(16);

  private titleObserver?: IntersectionObserver;

  protected projects: ProjectData[] = [];

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: object,
    private readonly http: HttpClient,
  ) { }

  ngOnInit(): void {
    this.http.get<{ projects: string[] }>('/api/projects').subscribe(({ projects }) => {
      for (const slug of projects) {
        this.http.get<ProjectData>(`/api/projects/${encodeURIComponent(slug)}`).subscribe((data) => {
          this.projects.push(data);
        });
      }
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

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const titleElement = this.projectsTitle?.nativeElement;
    if (!titleElement) {
      return;
    }

    this.titleObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        this.isTitleVisible = Boolean(entry?.isIntersecting);
      },
      {
        threshold: 0.35,
      },
    );

    this.titleObserver.observe(titleElement);
  }

  ngOnDestroy(): void {
    this.titleObserver?.disconnect();
  }
}
