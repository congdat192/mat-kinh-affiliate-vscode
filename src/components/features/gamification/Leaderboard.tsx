import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LeaderboardEntry } from '@/types/gamification';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export default function Leaderboard({ entries }: LeaderboardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>Bảng xếp hạng các đối tác hàng đầu trong tháng.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Hạng</TableHead>
              <TableHead>Tên Đối Tác</TableHead>
              <TableHead className="text-right">Số Khách Giới Thiệu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.rank}>
                <TableCell className="font-bold text-lg">{entry.avatar}</TableCell>
                <TableCell>{entry.name}</TableCell>
                <TableCell className="text-right font-semibold">{entry.referrals}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
