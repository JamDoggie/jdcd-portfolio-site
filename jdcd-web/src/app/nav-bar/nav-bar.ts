import { Component, HostListener, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'nav-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.scss',
})

export class NavBar implements OnInit {
  scrollPosY: number = 0;

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) { }

  ngOnInit(): void {
    this.updateScrollPosition();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateScrollPosition();
  }

  @HostListener('document:scroll')
  onDocumentScroll(): void {
    this.updateScrollPosition();
  }

  @HostListener('body:scroll')
  onBodyScroll(): void {
    this.updateScrollPosition();
  }

  private updateScrollPosition(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.scrollPosY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }
}