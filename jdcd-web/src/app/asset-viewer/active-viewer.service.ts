import { Injectable, signal } from '@angular/core';

export interface MobileViewerHandle {
  deactivate(): void;
}

@Injectable({ providedIn: 'root' })
export class ActiveViewerService {
  private readonly activeMobileViewer = signal<MobileViewerHandle | null>(null);
  readonly activeViewer = this.activeMobileViewer.asReadonly();

  readonly isMobile = signal(false);

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(pointer: coarse)');
    this.isMobile.set(mediaQuery.matches);

    const updateMobileFlag = (event: MediaQueryListEvent): void => {
      this.isMobile.set(event.matches);
    };

    const compatibleMediaQuery = mediaQuery as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };

    if (typeof compatibleMediaQuery.addEventListener === 'function') {
      compatibleMediaQuery.addEventListener('change', updateMobileFlag);
    } else {
      compatibleMediaQuery.addListener?.(updateMobileFlag);
    }
  }

  activate(viewer: MobileViewerHandle): void {
    const currentViewer = this.activeMobileViewer();
    if (currentViewer && currentViewer !== viewer) {
      currentViewer.deactivate();
    }

    this.activeMobileViewer.set(viewer);
  }

  deactivate(viewer: MobileViewerHandle): void {
    if (this.activeMobileViewer() === viewer) {
      this.activeMobileViewer.set(null);
    }
  }
}
