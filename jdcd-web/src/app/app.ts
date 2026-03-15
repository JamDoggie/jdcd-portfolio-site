import { AfterViewInit, Component, ElementRef, OnDestroy, signal, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBar } from './nav-bar/nav-bar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavBar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
  
export class App implements AfterViewInit, OnDestroy {
  protected readonly title = signal('jdcd-web');

  @ViewChild('bgVideo') bgVideo!: ElementRef<HTMLVideoElement>;
  private awaitingInteraction = false;

  ngAfterViewInit(): void {
    const video = this.bgVideo.nativeElement;
    this.configureVideoForAutoplay(video);
    this.tryPlayBackgroundVideo(video);
  }

  ngOnDestroy(): void {
    this.removeRetryListeners();
  }

  private configureVideoForAutoplay(video: HTMLVideoElement): void {
    video.defaultMuted = true;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.loop = true;
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
  }

  private tryPlayBackgroundVideo(video: HTMLVideoElement): void {
    const playAttempt = video.play();
    if (!playAttempt) {
      return;
    }

    playAttempt
      .then(() => this.removeRetryListeners())
      .catch(() => this.addRetryListeners());
  }

  private addRetryListeners(): void {
    if (this.awaitingInteraction) {
      return;
    }

    this.awaitingInteraction = true;
    document.addEventListener('pointerdown', this.retryPlay, true);
    document.addEventListener('keydown', this.retryPlay, true);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private removeRetryListeners(): void {
    if (!this.awaitingInteraction) {
      return;
    }

    this.awaitingInteraction = false;
    document.removeEventListener('pointerdown', this.retryPlay, true);
    document.removeEventListener('keydown', this.retryPlay, true);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private readonly retryPlay = (): void => {
    const video = this.bgVideo?.nativeElement;
    if (!video) {
      return;
    }

    this.configureVideoForAutoplay(video);
    this.tryPlayBackgroundVideo(video);
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.visibilityState !== 'visible') {
      return;
    }

    this.retryPlay();
  };
}
