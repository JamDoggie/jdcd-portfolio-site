import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, computed, DestroyRef, ElementRef, inject, input, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { SkillPreview } from '../portfolio/skill-preview/skill-preview';
import { SkillsDataService } from '../skills-data.service';

@Component({
  selector: 'app-project-showcase',
  imports: [SkillPreview],
  templateUrl: './project-showcase.html',
  styleUrl: './project-showcase.scss',
})
export class ProjectShowcase implements OnInit, AfterViewInit {
  slug = input.required<string>();
  title = input<string>('');
  subtitle = input<string>('');
  html = input<string>('');
  media = input<string[]>([]);
  skills = input<string[]>([]);
  flipped = input<boolean>(false);
  desktopVisibleCount = input<number>(1);
  mobileVisibleCount = input<number>(1);

  private readonly skillsData = inject(SkillsDataService);
  private readonly el = inject(ElementRef);
  skillDataList = computed(() => {
    const slugs = this.skills();
    if (slugs.length === 0) {
      return [];
    }

    const slugSet = new Set(slugs);
    return this.skillsData.skills().filter(s => slugSet.has(s.slug));
  });
  visible = signal(false);

  private readonly mobileBreakpoint = 768;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  effectiveVisibleCount = signal(1);
  currentIndex = signal(0);
  fullscreenImageUrl = signal<string | null>(null);
  viewerVisible = signal(false);
  fullscreenSlide = signal<'center' | 'exit-left' | 'exit-right' | 'enter-left' | 'enter-right'>('center');
  private fullscreenIndex = 0;
  private sliding = false;

  private readonly viewerFadeMs = 320;
  private readonly slideDurationMs = 250;
  private closeViewerTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.effectiveVisibleCount.set(this.desktopVisibleCount());
      return;
    }

    const mql = window.matchMedia(`(max-width: ${this.mobileBreakpoint}px)`);
    const update = (e: MediaQueryList | MediaQueryListEvent) => {
      this.effectiveVisibleCount.set(e.matches ? this.mobileVisibleCount() : this.desktopVisibleCount());
      // Reset index if it would be out of range
      const maxPage = Math.max(0, Math.ceil(this.media().length / this.effectiveVisibleCount()) - 1);
      if (this.currentIndex() > maxPage) {
        this.currentIndex.set(maxPage);
      }
    };
    update(mql);
    mql.addEventListener('change', update);
    this.destroyRef.onDestroy(() => mql.removeEventListener('change', update));
    this.destroyRef.onDestroy(() => {
      if (this.closeViewerTimeout) {
        clearTimeout(this.closeViewerTimeout);
      }
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.visible.set(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(this.el.nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  trackOffset = computed(() => {
    const len = this.media().length;
    if (len === 0) return 0;
    const count = this.effectiveVisibleCount();
    return -(this.currentIndex() * count * (100 / len));
  });

  totalPages = computed(() => {
    const len = this.media().length;
    const count = this.effectiveVisibleCount();
    return Math.max(1, Math.ceil(len / count));
  });

  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));

  prev(): void {
    const total = this.totalPages();
    if (total === 0) return;
    this.currentIndex.update(i => (i - 1 + total) % total);
  }

  next(): void {
    const total = this.totalPages();
    if (total === 0) return;
    this.currentIndex.update(i => (i + 1) % total);
  }

  goTo(index: number): void {
    this.currentIndex.set(index);
  }

  isVideo(url: string): boolean {
    return /\.(mp4|webm|ogg)$/i.test(url);
  }

  fullscreenPrev(): void {
    this.slideFullscreen('prev');
  }

  fullscreenNext(): void {
    this.slideFullscreen('next');
  }

  private slideFullscreen(dir: 'prev' | 'next'): void {
    const urls = this.media();
    if (urls.length <= 1 || this.sliding) return;
    this.sliding = true;

    // Phase 1: slide current media out
    this.fullscreenSlide.set(dir === 'next' ? 'exit-left' : 'exit-right');

    setTimeout(() => {
      // Update index & URL
      this.fullscreenIndex = dir === 'next'
        ? (this.fullscreenIndex + 1) % urls.length
        : (this.fullscreenIndex - 1 + urls.length) % urls.length;
      this.fullscreenImageUrl.set(urls[this.fullscreenIndex]);

      // Phase 2: position new media off-screen (no transition)
      this.fullscreenSlide.set(dir === 'next' ? 'enter-right' : 'enter-left');

      // Phase 3: slide new media in (next frame so browser picks up the position first)
      requestAnimationFrame(() => {
        this.fullscreenSlide.set('center');
        setTimeout(() => this.sliding = false, this.slideDurationMs);
      });
    }, this.slideDurationMs);
  }

  fullscreenIsVideo(): boolean {
    const url = this.fullscreenImageUrl();
    return url ? this.isVideo(url) : false;
  }

  openImageViewer(url: string): void {
    if (this.closeViewerTimeout) {
      clearTimeout(this.closeViewerTimeout);
      this.closeViewerTimeout = null;
    }

    this.fullscreenIndex = this.media().indexOf(url);
    this.fullscreenImageUrl.set(url);

    if (isPlatformBrowser(this.platformId)) {
      requestAnimationFrame(() => this.viewerVisible.set(true));
      return;
    }

    this.viewerVisible.set(true);
  }

  closeImageViewer(): void {
    this.viewerVisible.set(false);

    this.closeViewerTimeout = setTimeout(() => {
      this.fullscreenImageUrl.set(null);
      this.closeViewerTimeout = null;
    }, this.viewerFadeMs);
  }

  closeImageViewerOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeImageViewer();
    }
  }
}
