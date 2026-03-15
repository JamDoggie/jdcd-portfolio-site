import { Component } from '@angular/core';

interface SocialLink {
  name: string;
  url: string;
  iconUrl: string;
}  

@Component({
  selector: 'app-social-media-row',
  imports: [],
  templateUrl: './social-media-row.html',
  styleUrl: './social-media-row.scss',
})
  
export class SocialMediaRow {
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
}
