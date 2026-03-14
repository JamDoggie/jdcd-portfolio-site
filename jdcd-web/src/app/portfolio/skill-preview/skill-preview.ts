import { AfterViewInit, Component, DestroyRef, ElementRef, HostListener, inject, Input, PLATFORM_ID, signal, ViewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'skill-preview',
  templateUrl: './skill-preview.html',
  styleUrls: ['./skill-preview.scss'],
  host: { '[class.visible]': 'visible()' },
})
export class SkillPreview implements AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  visible = signal(false);
  @Input() skillName: string = '';
  @Input() skillIconUrl: string = '';
  @Input() skillDescription: string = '';
  @Input() invert: boolean = false;
  @Input() useGrayscale: boolean = false;

  @ViewChild('iconEl', { static: true }) iconEl!: ElementRef<HTMLElement>;
  @ViewChild('panelEl', { static: true }) panelEl!: ElementRef<HTMLElement>;

  showPanel: boolean = false;
  panelLeft: string = '50%';
  panelAbove: boolean = false;

  enterPanel() {
    this.updatePanelPosition();
    this.showPanel = true;
  }

  private updatePanelPosition() {
    const wrapper = this.iconEl.nativeElement.closest('.skill-preview-wrapper')! as HTMLElement;
    const wrapperRect = wrapper.getBoundingClientRect();
    // offsetWidth gives layout width unaffected by CSS transforms (e.g. scale)
    const panelWidth = this.panelEl.nativeElement.offsetWidth;
    const margin = 20;

    // Default: center under the icon
    let leftPx = wrapperRect.width / 2;

    // Panel edges in viewport (translateX(-50%) means panel is centered on leftPx)
    const panelHalfWidth = panelWidth / 2;
    const viewportLeft = wrapperRect.left + leftPx - panelHalfWidth;
    const viewportRight = wrapperRect.left + leftPx + panelHalfWidth;

    if (viewportLeft < margin) {
      leftPx += margin - viewportLeft;
    } else if (viewportRight > window.innerWidth - margin) {
      leftPx -= viewportRight - (window.innerWidth - margin);
    }

    const wrapperCenterY = wrapperRect.top + (wrapperRect.height / 2);
    this.panelAbove = wrapperCenterY > (window.innerHeight / 2);
    this.panelLeft = leftPx + 'px';
  }

  exitPanel() {
    this.showPanel = false;
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    if (this.showPanel) {
      this.updatePanelPosition();
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (this.showPanel) {
      this.updatePanelPosition();
    }
  }

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
}
