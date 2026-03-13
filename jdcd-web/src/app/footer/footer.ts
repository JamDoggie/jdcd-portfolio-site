import { ChangeDetectorRef, Component, NgZone } from '@angular/core';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  showCopiedLabel = false;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly hideDelayMs = 2000;

  constructor(
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  copyEmail(): void {
    navigator.clipboard.writeText('doodyjohndaniel@gmail.com');

    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    this.showCopiedLabel = true;
    this.cdr.detectChanges();

    this.hideTimeout = setTimeout(() => {
      this.ngZone.run(() => {
        this.showCopiedLabel = false;
        this.hideTimeout = null;
        this.cdr.detectChanges();
      });
    }, this.hideDelayMs);
  }
}
