import { Component, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'nav-bar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.scss',
})

export class NavBar {
  scrollPosY: number = 0;

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(event: Event): void {
    const target = event.target as Document;
    this.scrollPosY = target.defaultView?.scrollY ?? 0;
  }
}