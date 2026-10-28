import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class CacheService {
  private memoryCache = new Map<string, any>();
  private cacheDir = path.join(process.cwd(), '.cache');

  constructor() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getKeyHash(url: string): string {
    return crypto.createHash('sha256').update(url).digest('hex');
  }

  async getOrFetch<T>(url: string, fetcher: () => Promise<T>): Promise<{ data: T; cached: boolean }> {
    const hash = this.getKeyHash(url);

    if (this.memoryCache.has(hash)) {
      return { data: this.memoryCache.get(hash) as T, cached: true };
    }

    const filePath = path.join(this.cacheDir, `${hash}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as T;
      this.memoryCache.set(hash, parsed);
      return { data: parsed, cached: true };
    }

    const freshData = await fetcher();
    this.memoryCache.set(hash, freshData);
    fs.writeFileSync(filePath, JSON.stringify(freshData, null, 2), 'utf-8');
    return { data: freshData, cached: false };
  }
}