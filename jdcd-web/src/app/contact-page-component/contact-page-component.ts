import { AfterViewInit, ChangeDetectorRef, Component, DestroyRef, ElementRef, inject, NgZone, PLATFORM_ID, signal, ViewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Footer } from '../footer/footer';
import { SocialMediaRow } from '../portfolio/social-media-row/social-media-row';

@Component({
  selector: 'app-contact-page-component',
  imports: [FormsModule, Footer, SocialMediaRow],
  templateUrl: './contact-page-component.html',
  styleUrl: './contact-page-component.scss',
})
export class ContactPageComponent implements AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('bookVideo', { static: false }) bookVideoRef!: ElementRef<HTMLVideoElement>;
  private awaitingVideoInteraction = false;

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

  constructor(
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {
    this.bookAnimSrc = this.isSafari()
      ? 'assets/videos/book-anim.mp4'
      : 'assets/videos/book-anim.webm';
  }

  private isSafari(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    // Safari is the only major browser where vendor starts with "Apple"
    return navigator.vendor.includes('Apple');
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

    this.scrollToTop();

    if (this.bookVideoRef) {
      const video = this.bookVideoRef.nativeElement;
      this.configureBookVideoForAutoplay(video);
      video.addEventListener('loadeddata', this.onBookVideoReady, { once: true });
      video.load();
      this.destroyRef.onDestroy(() => this.removeVideoRetryListeners());
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

  private scrollToTop(): void {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }

  private configureBookVideoForAutoplay(video: HTMLVideoElement): void {
    video.defaultMuted = true;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.loop = false;
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.removeAttribute('loop');
  }

  private readonly onBookVideoReady = (): void => {
    const video = this.bookVideoRef?.nativeElement;
    if (video) {
      this.tryPlayBookVideo(video);
    }
  };

  private tryPlayBookVideo(video: HTMLVideoElement): void {
    const playAttempt = video.play();
    if (!playAttempt) {
      return;
    }

    playAttempt
      .then(() => this.removeVideoRetryListeners())
      .catch(() => this.addVideoRetryListeners());
  }

  private addVideoRetryListeners(): void {
    if (this.awaitingVideoInteraction) {
      return;
    }

    this.awaitingVideoInteraction = true;
    document.addEventListener('pointerdown', this.retryBookVideoPlayback, true);
    document.addEventListener('keydown', this.retryBookVideoPlayback, true);
    document.addEventListener('visibilitychange', this.handleBookVideoVisibilityChange);
  }

  private removeVideoRetryListeners(): void {
    if (!this.awaitingVideoInteraction) {
      return;
    }

    this.awaitingVideoInteraction = false;
    document.removeEventListener('pointerdown', this.retryBookVideoPlayback, true);
    document.removeEventListener('keydown', this.retryBookVideoPlayback, true);
    document.removeEventListener('visibilitychange', this.handleBookVideoVisibilityChange);
  }

  private readonly retryBookVideoPlayback = (): void => {
    const video = this.bookVideoRef?.nativeElement;
    if (!video) {
      return;
    }

    this.configureBookVideoForAutoplay(video);
    this.tryPlayBookVideo(video);
  };

  private readonly handleBookVideoVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') {
      return;
    }

    this.retryBookVideoPlayback();
  };
}
