import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, Inject, input, OnInit, PLATFORM_ID, signal } from '@angular/core';
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
  desktopVisibleCount = input<number>(1);
  mobileVisibleCount = input<number>(1);

  private readonly http = inject(HttpClient);
  skillDataList: SkillData[] = [];

  private readonly mobileBreakpoint = 768;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  effectiveVisibleCount = signal(1);
  currentIndex = signal(0);

  ngOnInit(): void {
    for (const slug of this.skills()) {
      this.http.get<SkillData>(`/api/skills/${encodeURIComponent(slug)}`).subscribe(skill => {
        this.skillDataList.push(skill);
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
}
