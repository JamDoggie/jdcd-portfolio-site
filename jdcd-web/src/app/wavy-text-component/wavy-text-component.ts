import { Component } from '@angular/core';

@Component({
  selector: 'app-wavy-text-component',
  imports: [],
  templateUrl: './wavy-text-component.html',
  styleUrl: './wavy-text-component.scss',
})

export class WavyTextComponent {
  title = "My Skills";
  titleChars = this.title.split('');
}
