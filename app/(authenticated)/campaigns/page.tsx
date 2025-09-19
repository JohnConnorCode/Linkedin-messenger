import { createServerComponentClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Plus, Play, Pause, BarChart3, Users, Clock } from 'lucide-react';

export default async function CampaignsPage() {
  const supabase = await createServerComponentClient();

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select(`
      *,
      message_templates(name, body),
      campaign_targets(count),
      task_queue!inner(status)
    `)
    .order('created_at', { ascending: false });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground mt-2">
            Manage your LinkedIn messaging campaigns
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {campaigns?.map((campaign: any) => (
          <Card key={campaign.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{campaign.name}</CardTitle>
                  <CardDescription className="mt-1">
                    Using template: {campaign.message_templates?.name}
                  </CardDescription>
                </div>
                <Badge className={getStatusColor(campaign.status)}>
                  {campaign.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Targets</p>
                      <p className="font-medium">{campaign.campaign_targets?.[0]?.count || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Daily Cap</p>
                      <p className="font-medium">{campaign.daily_cap}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Sent</p>
                      <p className="font-medium">0</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-muted-foreground">Manual Approval</p>
                      <p className="font-medium">{campaign.require_manual_approval ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link href={`/campaigns/${campaign.id}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      View Details
                    </Button>
                  </Link>
                  {campaign.status === 'draft' && (
                    <Button className="flex-1">
                      <Play className="h-4 w-4 mr-2" />
                      Start Campaign
                    </Button>
                  )}
                  {campaign.status === 'active' && (
                    <Button variant="secondary" className="flex-1">
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Campaign
                    </Button>
                  )}
                  {campaign.status === 'paused' && (
                    <Button className="flex-1">
                      <Play className="h-4 w-4 mr-2" />
                      Resume Campaign
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!campaigns || campaigns.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No campaigns yet</p>
              <Link href="/campaigns/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first campaign
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}