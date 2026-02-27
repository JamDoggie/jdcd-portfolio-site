import { Component } from '@angular/core';
import { WavyTextComponent } from '../../wavy-text-component/wavy-text-component';
import { SkillPreview } from '../skill-preview/skill-preview';

@Component({
  selector: 'portfolio-intro-component',
  imports: [WavyTextComponent, SkillPreview],
  templateUrl: './portfolio-intro-component.html',
  styleUrl: './portfolio-intro-component.scss',
})
export class PortfolioIntroComponent {

}
