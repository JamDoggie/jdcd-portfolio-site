import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
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
export class PortfolioIntroComponent {
  private http = inject(HttpClient);
  skills = toSignal(
    this.http.get<{ skills: SkillData[] }>('/api/skills').pipe(map(res => res.skills)),
    { initialValue: [] as SkillData[] },
  );
}
