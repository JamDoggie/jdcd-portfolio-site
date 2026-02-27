import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WavyTextComponent } from './wavy-text-component';

describe('WavyTextComponent', () => {
  let component: WavyTextComponent;
  let fixture: ComponentFixture<WavyTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WavyTextComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WavyTextComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
