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
  @Input() useGrayscale: boolean = false;

  @ViewChild('iconEl', { static: true }) iconEl!: ElementRef<HTMLElement>;
  @ViewChild('panelEl', { static: true }) panelEl!: ElementRef<HTMLElement>;

  showPanel: boolean = false;
  panelLeft: string = '50%';

  enterPanel() {
    const wrapper = this.iconEl.nativeElement.closest('.skill-preview-wrapper')! as HTMLElement;
    const wrapperRect = wrapper.getBoundingClientRect();
    // offsetWidth gives layout width unaffected by CSS transforms (e.g. scale)
    const panelWidth = this.panelEl.nativeElement.offsetWidth;
    const margin = 20;

    // Default: center under the icon
    let leftPx = wrapperRect.width / 2;

    // Panel edges in viewport (translateX(-50%) means panel is centered on leftPx)
    const panelHalfWidth = panelWidth / 2;
    const viewportLeft = wrapperRect.left + leftPx - panelHalfWidth;
    const viewportRight = wrapperRect.left + leftPx + panelHalfWidth;

    if (viewportLeft < margin) {
      leftPx += margin - viewportLeft;
    } else if (viewportRight > window.innerWidth - margin) {
      leftPx -= viewportRight - (window.innerWidth - margin);
    }

    this.panelLeft = leftPx + 'px';
    this.showPanel = true;
  }

  exitPanel() {
    this.showPanel = false;
  }
}
