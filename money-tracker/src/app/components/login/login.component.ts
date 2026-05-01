import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../services/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  username = '';
  password = '';
  error = signal('');
  loading = signal(false);

  constructor(private auth: AuthService, private router: Router, public i18n: I18nService) {}

  async onLogin(): Promise<void> {
    this.error.set('');
    this.loading.set(true);
    try {
      const ok = await this.auth.login(this.username, this.password);
      if (ok) {
        this.router.navigate(['/dashboard']);
      } else {
        this.error.set(this.i18n.t('login.errorInvalid'));
      }
    } finally {
      this.loading.set(false);
    }
  }
}
