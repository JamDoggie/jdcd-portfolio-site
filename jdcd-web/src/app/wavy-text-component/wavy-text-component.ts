import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, inject, input, PLATFORM_ID, signal } from '@angular/core';

@Component({
  selector: 'app-wavy-text-component',
  imports: [],
  templateUrl: './wavy-text-component.html',
  styleUrl: './wavy-text-component.scss',
})

export class WavyTextComponent implements AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  title = input("My Skills");
  visible = signal(false);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.visible.set(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.visible.set(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(this.el.nativeElement);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  get titleChars() { return this.title().split(''); }
}
