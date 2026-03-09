import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WavyTextComponent } from '../../wavy-text-component/wavy-text-component';
import { SkillPreview } from '../skill-preview/skill-preview';

interface SkillSummary {
  slug: string;
  title: string;
  order: number;
}

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
    this.http.get<{ skills: SkillSummary[] }>('/api/skills').subscribe(res => {
      for (const s of res.skills) {
        this.http.get<SkillData>(`/api/skills/${s.slug}`).subscribe(skill => {
          this.skills.push(skill);
          this.skills.sort((a, b) => a.order - b.order);
        });
      }
    });
  }

}
