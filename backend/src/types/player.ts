export interface IPLPlayer {
  id: string;
  name: string;
  nationality: string;

  role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
  isBatsman: boolean;
  isBowler: boolean;
  isAllRounder: boolean;
  isWicketkeeper: boolean;

  batsRightHanded: boolean;

  bowlingStyle: 'fast' | 'medium-fast' | 'spin' | 'none';
  bowlsFast: boolean;
  bowlsSpin: boolean;

  isForeignPlayer: boolean;
  currentTeam: string;
  hasPlayedForMoreThanOneTeam: boolean;
  hasWonIPL: boolean;
  isCurrentlyCaptain: boolean;

  iplDebut: number;
  isVeteran: boolean;
  hasPlayedOver100IPLMatches: boolean;
  hasPlayedTestCricket: boolean;
  hasPlayedWorldCup: boolean;
  isWellKnown: boolean;
}
