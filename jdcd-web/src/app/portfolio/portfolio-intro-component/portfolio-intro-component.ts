import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WavyTextComponent } from '../../wavy-text-component/wavy-text-component';
import { SkillPreview } from '../skill-preview/skill-preview';

interface SkillData {
  slug: string;
  title: string;
  order: number;
  invert: boolean;
  html: string;
  iconUrl: string;
}

@Component({
  selector: 'portfolio-intro-component',
  imports: [WavyTextComponent, SkillPreview],
  templateUrl: './portfolio-intro-component.html',
  styleUrl: './portfolio-intro-component.scss',
})
export class PortfolioIntroComponent implements OnInit {
  private http = inject(HttpClient);
  skills: SkillData[] = [];

  ngOnInit(): void {
    this.http.get<{ skills: SkillData[] }>('/api/skills').subscribe(res => {
      this.skills = res.skills;
    });
  }

}
