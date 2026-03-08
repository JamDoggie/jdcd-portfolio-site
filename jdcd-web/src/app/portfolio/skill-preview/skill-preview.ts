import { Component, Input } from '@angular/core';

@Component({
  selector: 'skill-preview',
  templateUrl: './skill-preview.html',
  styleUrls: ['./skill-preview.scss'],
})
export class SkillPreview {
  @Input() skillName: string = ''; // What this skill will show up as.
  @Input() skillIcon: string = ''; // The path to the skill's icon, relative to the skills folder (src/assets/skills).
  @Input() skillYears: string = ''; // Number of years experience with this skill
  @Input() invert: boolean = false; // Whether to invert the skill icon (for better visibility on dark backgrounds)

  showPanel: boolean = false;

  enterPanel() {
    this.showPanel = true;
  }

  exitPanel() {
    this.showPanel = false;
  }
}
