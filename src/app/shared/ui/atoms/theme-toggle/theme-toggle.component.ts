import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ThemePreference, ThemeService } from '../../../services/utils/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-toggle.component.html',
  styleUrl: './theme-toggle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ThemeToggleComponent {
  private readonly themeService = inject(ThemeService);

  readonly preference = toSignal(this.themeService.preference$, {
    initialValue: this.themeService.currentPreference
  });

  private readonly labels: Record<ThemePreference, string> = {
    system: 'Sistema',
    light: 'Claro',
    dark: 'Oscuro'
  };

  onToggle(): void {
    this.themeService.cyclePreference();
  }

  labelFor(preference: ThemePreference): string {
    return this.labels[preference];
  }

  description(): string {
    return `Cambiar tema. Actual: ${this.labelFor(this.preference())}`;
  }
}
