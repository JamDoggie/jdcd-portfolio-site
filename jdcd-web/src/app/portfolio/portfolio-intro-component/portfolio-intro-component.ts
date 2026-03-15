import { AfterViewInit, Component, DestroyRef, ElementRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { WavyTextComponent } from '../../wavy-text-component/wavy-text-component';
import { SkillPreview } from '../skill-preview/skill-preview';
import { SkillsDataService } from '../../skills-data.service';
import { SocialMediaRow } from '../social-media-row/social-media-row';

@Component({
  selector: 'portfolio-intro-component',
  imports: [WavyTextComponent, SkillPreview, SocialMediaRow],
  templateUrl: './portfolio-intro-component.html',
  styleUrl: './portfolio-intro-component.scss',
})

export class PortfolioIntroComponent implements AfterViewInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly skillsData = inject(SkillsDataService);

  firstRowVisible = signal(false);

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
