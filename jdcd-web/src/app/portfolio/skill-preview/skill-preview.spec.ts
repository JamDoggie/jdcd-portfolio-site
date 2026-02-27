import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkillPreview } from './skill-preview';

describe('SkillPreview', () => {
  let component: SkillPreview;
  let fixture: ComponentFixture<SkillPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillPreview]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SkillPreview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
