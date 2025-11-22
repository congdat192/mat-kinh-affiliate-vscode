export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or icon component name
  achieved: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  referrals: number;
  avatar: string; // Emoji or URL
}
