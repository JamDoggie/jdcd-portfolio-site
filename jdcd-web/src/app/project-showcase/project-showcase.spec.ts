import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectShowcase } from './project-showcase';

describe('ProjectShowcase', () => {
  let component: ProjectShowcase;
  let fixture: ComponentFixture<ProjectShowcase>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectShowcase]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectShowcase);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
