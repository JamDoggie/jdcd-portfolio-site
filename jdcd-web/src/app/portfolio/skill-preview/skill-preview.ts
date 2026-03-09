import { Component, ElementRef, Input, ViewChild } from '@angular/core';

@Component({
  selector: 'skill-preview',
  templateUrl: './skill-preview.html',
  styleUrls: ['./skill-preview.scss'],
})
export class SkillPreview {
  @Input() skillName: string = '';
  @Input() skillIconUrl: string = '';
  @Input() skillDescription: string = '';
  @Input() invert: boolean = false;

  @ViewChild('iconEl', { static: true }) iconEl!: ElementRef<HTMLElement>;

  showPanel: boolean = false;
  panelLeft: string = '50%';

  enterPanel() {
    const wrapperRect = this.iconEl.nativeElement.closest('.skill-preview-wrapper')!.getBoundingClientRect();
    const viewportCenterX = window.innerWidth / 2;
    this.panelLeft = (viewportCenterX - wrapperRect.left) + 'px';
    this.showPanel = true;
  }

  exitPanel() {
    this.showPanel = false;
  }
}
