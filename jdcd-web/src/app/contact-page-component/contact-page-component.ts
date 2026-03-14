import { AfterViewInit, ChangeDetectorRef, Component, DestroyRef, ElementRef, inject, NgZone, PLATFORM_ID, signal, ViewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Footer } from '../footer/footer';

@Component({
  selector: 'app-contact-page-component',
  imports: [FormsModule, Footer],
  templateUrl: './contact-page-component.html',
  styleUrl: './contact-page-component.scss',
})
export class ContactPageComponent implements AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('bookVideo', { static: false }) bookVideoRef!: ElementRef<HTMLVideoElement>;

  introVisible = signal(false);
  formVisible = signal(false);

  showCopiedLabel = false;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly hideDelayMs = 2000;

  contactName = '';
  contactEmail = '';
  contactSubject = '';
  contactMessage = '';

  readonly bookAnimSrc: string;
  readonly bookAnimType: string;

  constructor(
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {
    const useMp4 = this.shouldUseMp4BookAnim();
    this.bookAnimSrc = useMp4 ? 'assets/videos/book-anim.mp4' : 'assets/videos/book-anim.webm';
    this.bookAnimType = useMp4 ? 'video/mp4' : 'video/webm';
  }

  private shouldUseMp4BookAnim(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    const userAgent = navigator.userAgent;
    const vendor = navigator.vendor || '';

    const isSafariEngine = /Safari/i.test(userAgent) && /Apple/i.test(vendor);
    const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|GSA/i.test(userAgent);

    return isSafariEngine && !isOtherIosBrowser;
  }

  copyEmail(): void {
    navigator.clipboard.writeText('doodyjohndaniel@gmail.com');

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    this.showCopiedLabel = true;
    this.cdr.detectChanges();

    this.hideTimeout = setTimeout(() => {
      this.ngZone.run(() => {
        this.showCopiedLabel = false;
        this.hideTimeout = null;
        this.cdr.detectChanges();
      });
    }, this.hideDelayMs);
  }

  sendMessage(): void {
    const subject = encodeURIComponent(this.contactSubject || 'Contact Form');
    const body = encodeURIComponent(
      `Name: ${this.contactName}\nEmail: ${this.contactEmail}\n\n${this.contactMessage}`
    );
    window.open(`mailto:doodyjohndaniel@gmail.com?subject=${subject}&body=${body}`, '_self');
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.introVisible.set(true);
      this.formVisible.set(true);
      return;
    }

    if (this.bookVideoRef) {
      this.bookVideoRef.nativeElement.load();
    }

    const introRow = this.el.nativeElement.querySelector('.intro-row');
    const formWindow = this.el.nativeElement.querySelector('.contact-card');

    if (introRow) {
      const introObs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.introVisible.set(true);
            introObs.disconnect();
          }
        },
        { threshold: 0.2 }
      );
      introObs.observe(introRow);
      this.destroyRef.onDestroy(() => introObs.disconnect());
    }

    if (formWindow) {
      const formObs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            this.formVisible.set(true);
            formObs.disconnect();
          }
        },
        { threshold: 0.15 }
      );
      formObs.observe(formWindow);
      this.destroyRef.onDestroy(() => formObs.disconnect());
    }
  }
}
