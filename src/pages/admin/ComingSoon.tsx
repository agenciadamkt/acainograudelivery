import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Construction className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Esta funcionalidade será implementada nos próximos sprints.
        </CardContent>
      </Card>
    </div>
  );
}
