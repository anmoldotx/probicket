import type { GameSession } from '../types';

export interface ISessionStore {
  create(session: GameSession): Promise<void>;
  get(id: string): Promise<GameSession | null>;
  update(id: string, patch: Partial<GameSession>): Promise<void>;
  delete(id: string): Promise<void>;
}
