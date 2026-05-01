import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { db, hashPassword, seedDatabase } from '../database/app.database';
import type { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser = signal<User | null>(null);
  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly ready: Promise<void>;

  constructor(private router: Router) {
    this.ready = this.init();
  }

  private async init(): Promise<void> {
    await seedDatabase();
    const stored = localStorage.getItem('currentUserId');
    if (stored) {
      const user = await db.users.get(Number(stored));
      if (user) {
        this.currentUser.set(user);
      }
    }
  }

  async login(username: string, password: string): Promise<boolean> {
    await seedDatabase();
    const hash = await hashPassword(password);
    const user = await db.users.where('username').equals(username).first();
    if (user && user.passwordHash === hash) {
      this.currentUser.set(user);
      localStorage.setItem('currentUserId', String(user.id));
      return true;
    }
    return false;
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('currentUserId');
    this.router.navigate(['/login']);
  }

  getUserId(): number {
    return this.currentUser()?.id ?? 0;
  }
}
