import type { ISessionStore } from '../interfaces/ISessionStore';
import type { GameSession } from '../types';

export class InMemorySessionStore implements ISessionStore {
  private readonly store = new Map<string, GameSession>();
  private readonly sweepInterval: NodeJS.Timeout;

  constructor(sweepIntervalMs = 60_000) {
    this.sweepInterval = setInterval(() => this.sweep(), sweepIntervalMs);
    this.sweepInterval.unref();
  }

  async create(session: GameSession): Promise<void> {
    this.store.set(session.id, session);
  }

  async get(id: string): Promise<GameSession | null> {
    const session = this.store.get(id);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      this.store.delete(id);
      return null;
    }
    return session;
  }

  async update(id: string, patch: Partial<GameSession>): Promise<void> {
    const session = await this.get(id);
    if (!session) return;
    this.store.set(id, { ...session, ...patch, updatedAt: Date.now() });
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  private sweep(): void {
    const now = Date.now();
    for (const [id, session] of this.store) {
      if (session.expiresAt < now) this.store.delete(id);
    }
  }

  destroy(): void {
    clearInterval(this.sweepInterval);
  }
}
