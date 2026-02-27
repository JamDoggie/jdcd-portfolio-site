import { Component, input } from '@angular/core';

@Component({
  selector: 'skill-preview',
  imports: [],
  templateUrl: './skill-preview.html',
  styleUrl: './skill-preview.scss',
})

export class SkillPreview {
  skillName = input(""); // What this skill will show up as.
  skillIcon = input(""); // The path to the skill's icon, relative to the skills folder (src/assets/skills).
  skillYears = input(""); // Number of years experience with this skill
}
