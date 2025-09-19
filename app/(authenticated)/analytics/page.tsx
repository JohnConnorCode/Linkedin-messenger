import { createServerComponentClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Users, Send, CheckCircle, XCircle } from 'lucide-react';

export default async function AnalyticsPage() {
  const supabase = await createServerComponentClient();

  // Get message statistics
  const { data: stats } = await supabase.rpc('get_message_stats') as any;

  // Get recent campaign performance
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select(`
      *,
      task_queue(status)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  // Calculate metrics
  const totalSent = stats?.[0]?.total_sent || 0;
  const totalSucceeded = stats?.[0]?.total_succeeded || 0;
  const totalFailed = stats?.[0]?.total_failed || 0;
  const successRate = totalSent > 0 ? Math.round((totalSucceeded / totalSent) * 100) : 0;

  const metrics = [
    {
      title: 'Total Messages Sent',
      value: totalSent,
      icon: Send,
      color: 'text-blue-500',
    },
    {
      title: 'Success Rate',
      value: `${successRate}%`,
      icon: TrendingUp,
      color: 'text-green-500',
    },
    {
      title: 'Successful',
      value: totalSucceeded,
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      title: 'Failed',
      value: totalFailed,
      icon: XCircle,
      color: 'text-red-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track your messaging performance and campaign metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>
            Recent campaign activity and success rates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {campaigns?.map((campaign: any) => {
              const tasks = campaign.task_queue || [];
              const succeeded = tasks.filter((t: any) => t.status === 'succeeded').length;
              const total = tasks.length;
              const rate = total > 0 ? Math.round((succeeded / total) * 100) : 0;

              return (
                <div key={campaign.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {succeeded} of {total} messages sent
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{rate}%</p>
                    <p className="text-xs text-muted-foreground">Success rate</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Trends</CardTitle>
          <CardDescription>
            Message volume over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <BarChart3 className="h-8 w-8 mr-2" />
            <span>Chart visualization coming soon</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}