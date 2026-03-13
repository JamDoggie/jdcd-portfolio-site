import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetViewer } from './asset-viewer';

describe('AssetViewer', () => {
  let component: AssetViewer;
  let fixture: ComponentFixture<AssetViewer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetViewer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssetViewer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
