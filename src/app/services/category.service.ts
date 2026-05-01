import { Injectable } from '@angular/core';
import { db } from '../database/app.database';
import type { Category } from '../models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  async getAll(): Promise<Category[]> {
    return db.categories.toArray();
  }

  async getById(id: number): Promise<Category | undefined> {
    return db.categories.get(id);
  }

  async add(category: Omit<Category, 'id'>): Promise<number> {
    return db.categories.add(category as Category);
  }

  async update(id: number, changes: Partial<Category>): Promise<void> {
    await db.categories.update(id, changes);
  }

  async delete(id: number): Promise<void> {
    await db.categories.delete(id);
  }
}
