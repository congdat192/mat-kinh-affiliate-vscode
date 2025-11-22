import BadgeCard from '@/components/features/gamification/BadgeCard';
import Leaderboard from '@/components/features/gamification/Leaderboard';
import { MOCK_BADGES, MOCK_LEADERBOARD } from '@/lib/mock/gamification';

export default function GamificationPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Thành Tích & Bảng Xếp Hạng
      </h1>

      {/* Achievements Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Thành Tích Của Bạn
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {MOCK_BADGES.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      </section>

      {/* Leaderboard Section */}
      <section>
        <Leaderboard entries={MOCK_LEADERBOARD} />
      </section>
    </div>
  );
}
