import type { IPLPlayer } from '../types';

export interface IPlayerRepository {
  getAllPlayers(): Promise<IPLPlayer[]>;
}
