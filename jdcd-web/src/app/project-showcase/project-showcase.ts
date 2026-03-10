import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, input, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { SkillPreview } from '../portfolio/skill-preview/skill-preview';

interface SkillData {
  slug: string;
  title: string;
  order: number;
  invert: boolean;
  html: string;
  iconUrl: string;
}

@Component({
  selector: 'app-project-showcase',
  imports: [SkillPreview],
  templateUrl: './project-showcase.html',
  styleUrl: './project-showcase.scss',
})
export class ProjectShowcase implements OnInit {
  slug = input.required<string>();
  title = input<string>('');
  subtitle = input<string>('');
  html = input<string>('');
  media = input<string[]>([]);
  skills = input<string[]>([]);
  flipped = input<boolean>(false);
  desktopVisibleCount = input<number>(1);
  mobileVisibleCount = input<number>(1);

  private readonly http = inject(HttpClient);
  skillDataList = signal<SkillData[]>([]);

  private readonly mobileBreakpoint = 768;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  effectiveVisibleCount = signal(1);
  currentIndex = signal(0);
  fullscreenImageUrl = signal<string | null>(null);
  viewerVisible = signal(false);

  private readonly viewerFadeMs = 320;
  private closeViewerTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    const slugs = this.skills();
    if (slugs.length > 0) {
      this.http.get<{ skills: SkillData[] }>('/api/skills').subscribe(res => {
        const slugSet = new Set(slugs);
        this.skillDataList.set(res.skills.filter(s => slugSet.has(s.slug)));
      });
    }

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

  openImageViewer(url: string): void {
    if (this.closeViewerTimeout) {
      clearTimeout(this.closeViewerTimeout);
      this.closeViewerTimeout = null;
    }

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
