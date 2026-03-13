import { Component, inject } from '@angular/core';
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
export class PortfolioIntroComponent {
  private readonly skillsData = inject(SkillsDataService);
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
}
