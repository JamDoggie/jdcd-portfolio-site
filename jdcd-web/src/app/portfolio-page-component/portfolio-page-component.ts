import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, PLATFORM_ID, ViewChild } from '@angular/core';
import { PortfolioIntroComponent } from '../portfolio/portfolio-intro-component/portfolio-intro-component';

@Component({
  selector: 'app-portfolio-page-component',
  imports: [PortfolioIntroComponent],
  templateUrl: './portfolio-page-component.html',
  styleUrl: './portfolio-page-component.scss',
})
export class PortfolioPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('projectsTitle')
  private readonly projectsTitle?: ElementRef<HTMLElement>;

  protected isTitleVisible = false;
  protected readonly titleText = 'My Projects';
  protected readonly titleLayers = this.buildLayers(16);

  private titleObserver?: IntersectionObserver;

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) { }

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
