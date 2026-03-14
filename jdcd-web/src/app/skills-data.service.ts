import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, shareReplay } from 'rxjs';

export interface SkillData {
  slug: string;
  title: string;
  order: number;
  invert: boolean;
  html: string;
  iconUrl: string;
}

@Injectable({ providedIn: 'root' })
export class SkillsDataService {
  private readonly http = inject(HttpClient);

  private readonly skills$ = this.http
    .get<{ skills: SkillData[] }>('api/skills.json')
    .pipe(
      map(res => res.skills),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

  readonly skills = toSignal(this.skills$, { initialValue: [] as SkillData[] });
}
