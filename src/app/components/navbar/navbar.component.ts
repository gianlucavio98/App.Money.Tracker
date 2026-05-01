import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { I18nService } from '../../services/i18n.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  isCollapsed = true;

  constructor(public auth: AuthService, public themeService: ThemeService, public i18n: I18nService) {}

  toggleNav(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  closeNav(): void {
    this.isCollapsed = true;
  }
}
