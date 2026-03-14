import { AfterViewInit, Component, DestroyRef, ElementRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { WavyTextComponent } from '../../wavy-text-component/wavy-text-component';
import { SkillPreview } from '../skill-preview/skill-preview';
import { SkillsDataService } from '../../skills-data.service';

interface SocialLink {
  name: string;
  url: string;
  iconUrl: string;
}

@Component({
  selector: 'portfolio-intro-component',
  imports: [WavyTextComponent, SkillPreview],
  templateUrl: './portfolio-intro-component.html',
  styleUrl: './portfolio-intro-component.scss',
})
export class PortfolioIntroComponent implements AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly skillsData = inject(SkillsDataService);

  firstRowVisible = signal(false);
  socialLinks: SocialLink[] = [
    {
      name: 'GitHub',
      url: 'https://github.com/JamDoggie',
      iconUrl: 'assets/images/common/github-original.svg',
    },
    {
      name: 'LinkedIn',
      url: 'https://www.linkedin.com/in/john-daniel-doody-26313a326/',
      iconUrl: 'assets/images/common/linkedin-plain.svg',
    },
    {
      name: 'Twitter / X',
      url: 'https://x.com/jamdoggie',
      iconUrl: 'assets/images/common/twitter-original.svg',
    },
    {
      name: 'Bluesky',
      url: 'https://bsky.app/profile/jamdoggie.spkymnr.xyz',
      iconUrl: 'assets/images/common/bluesky.svg',
    },
  ];

  skills = this.skillsData.skills;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.firstRowVisible.set(true);
      return;
    }

    const firstRow = this.el.nativeElement.querySelector('.first-row');
    if (!firstRow) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          this.firstRowVisible.set(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(firstRow);
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
