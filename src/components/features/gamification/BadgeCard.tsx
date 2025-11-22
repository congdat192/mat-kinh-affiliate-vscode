import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/types/gamification';
import { cn } from '@/lib/utils';
import { CheckCircle2, Lock } from 'lucide-react';

interface BadgeCardProps {
  badge: Badge;
}

export default function BadgeCard({ badge }: BadgeCardProps) {
  return (
    <Card
      className={cn(
        'text-center transition-transform hover:scale-105',
        badge.achieved ? 'border-green-500 bg-green-50' : 'bg-gray-50'
      )}
    >
      <CardHeader>
        <div className="relative mx-auto w-fit">
            <div className="text-6xl mb-4">{badge.icon}</div>
            {badge.achieved ? (
                <CheckCircle2 className="absolute -top-1 -right-1 h-6 w-6 text-white bg-green-500 rounded-full p-1" />
            ) : (
                <Lock className="absolute -top-1 -right-1 h-6 w-6 text-white bg-gray-400 rounded-full p-1" />
            )}
        </div>
        <CardTitle className={cn('text-xl', !badge.achieved && 'text-gray-500')}>
            {badge.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className={cn(badge.achieved ? '' : 'text-gray-400')}>
            {badge.description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
