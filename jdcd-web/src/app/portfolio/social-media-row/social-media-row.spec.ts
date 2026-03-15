import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SocialMediaRow } from './social-media-row';

describe('SocialMediaRow', () => {
  let component: SocialMediaRow;
  let fixture: ComponentFixture<SocialMediaRow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SocialMediaRow],
    }).compileComponents();

    fixture = TestBed.createComponent(SocialMediaRow);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
