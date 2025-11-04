import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonAppearance, MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-button',
  imports: [
    MatButtonModule
  ],
  templateUrl: './button.html',
  styleUrl: './button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Button {
  id = input('');
  name = input('');
  label = input('');
  type = input('button');
  appearance = input('filled' as MatButtonAppearance);
  onClick = output();
}
