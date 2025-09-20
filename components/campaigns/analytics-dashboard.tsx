'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Brain,
  DollarSign,
  Users,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Download,
  RefreshCw,
  Sparkles,
  Zap,
  Calendar,
  BarChart3
} from 'lucide-react';
import { PerformanceAnalyzer, CampaignMetrics, PerformanceRecommendation } from '@/lib/analytics/performance-analyzer';
import { cn } from '@/lib/utils';

interface AnalyticsDashboardProps {
  campaignId: string;
}

export function AnalyticsDashboard({ campaignId }: AnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<CampaignMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<PerformanceRecommendation[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  const analyzer = new PerformanceAnalyzer();

  useEffect(() => {
    loadAnalytics();
  }, [campaignId, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch campaign analytics
      const { metrics: campaignMetrics, recommendations: campaignRecs } = await analyzer.analyzeCampaign(campaignId);
      setMetrics(campaignMetrics);
      setRecommendations(campaignRecs);

      // Fetch trends
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const performanceTrends = await analyzer.getPerformanceTrends(campaignId, days);
      setTrends(performanceTrends);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const exportData = () => {
    if (!metrics) return;

    const data = {
      metrics,
      recommendations,
      trends,
      exported: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaignId}-analytics.json`;
    a.click();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const industryData = Object.entries(metrics.industryPerformance)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const roleData = Object.entries(metrics.rolePerformance)
    .map(([name, value]) => ({ name, value }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Calculate performance score
  const performanceScore = Math.round(
    ((metrics.successRate * 0.3) +
     (metrics.responseRate * 0.4) +
     (metrics.avgConfidenceScore * 0.3)) * 100
  );

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Campaign Analytics</h2>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Performance Score
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{performanceScore}</span>
              <span className="text-sm text-muted-foreground mb-1">/100</span>
            </div>
            <Progress value={performanceScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Messages Sent
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">{metrics.messagesSent}</span>
              <span className="text-sm text-muted-foreground mb-1">
                / {metrics.totalTargets}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">
                {Math.round((metrics.messagesSent / metrics.totalTargets) * 100)}% complete
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Response Rate
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">
                {(metrics.responseRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {metrics.responseRate > 0.15 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Above average</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">Below average</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                AI Confidence
              </CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">
                {(metrics.avgConfidenceScore * 100).toFixed(0)}%
              </span>
            </div>
            <Badge
              variant={
                metrics.avgConfidenceScore >= 0.9 ? "default" :
                metrics.avgConfidenceScore >= 0.8 ? "secondary" : "destructive"
              }
              className="mt-2"
            >
              {metrics.avgConfidenceScore >= 0.9 ? 'Excellent' :
               metrics.avgConfidenceScore >= 0.8 ? 'Good' : 'Needs Improvement'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Performance Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Performance Recommendations</CardTitle>
                <CardDescription>
                  AI-powered insights to improve your campaign
                </CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                {recommendations.length} insights
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.slice(0, 5).map((rec) => (
                <div
                  key={rec.id}
                  className={cn(
                    "p-4 rounded-lg border",
                    rec.priority === 'high' && "border-red-200 bg-red-50 dark:bg-red-950/20",
                    rec.priority === 'medium' && "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20",
                    rec.priority === 'low' && "border-blue-200 bg-blue-50 dark:bg-blue-950/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      rec.type === 'timing' && "bg-blue-100 dark:bg-blue-900",
                      rec.type === 'targeting' && "bg-green-100 dark:bg-green-900",
                      rec.type === 'content' && "bg-purple-100 dark:bg-purple-900",
                      rec.type === 'ai' && "bg-indigo-100 dark:bg-indigo-900",
                      rec.type === 'budget' && "bg-yellow-100 dark:bg-yellow-900",
                      rec.type === 'strategy' && "bg-red-100 dark:bg-red-900"
                    )}>
                      {rec.type === 'timing' && <Clock className="h-4 w-4" />}
                      {rec.type === 'targeting' && <Target className="h-4 w-4" />}
                      {rec.type === 'content' && <MessageSquare className="h-4 w-4" />}
                      {rec.type === 'ai' && <Brain className="h-4 w-4" />}
                      {rec.type === 'budget' && <DollarSign className="h-4 w-4" />}
                      {rec.type === 'strategy' && <Zap className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{rec.title}</h4>
                        <Badge
                          variant={
                            rec.priority === 'high' ? 'destructive' :
                            rec.priority === 'medium' ? 'secondary' : 'outline'
                          }
                          className="text-xs"
                        >
                          {rec.priority}
                        </Badge>
                        {rec.estimatedImprovement && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <TrendingUp className="h-3 w-3" />
                            +{rec.estimatedImprovement}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {rec.description}
                      </p>
                      {rec.impact && (
                        <p className="text-xs text-muted-foreground mb-2">
                          <strong>Impact:</strong> {rec.impact}
                        </p>
                      )}
                      {rec.actionable && rec.suggestedAction && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          {rec.suggestedAction}
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Performance Trends */}
        {trends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Messages sent and response rate over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="sent"
                    stroke="#3b82f6"
                    name="Messages Sent"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="responseRate"
                    stroke="#10b981"
                    name="Response Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Industry Performance */}
        {industryData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Industries</CardTitle>
              <CardDescription>Messages sent by industry</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={industryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Additional Insights */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Best Send Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{metrics.bestPerformingTime}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Highest engagement rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Best Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{metrics.bestPerformingDay}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Most responses received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Cost Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">
                ${metrics.totalCost.toFixed(2)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${metrics.costPerMessage.toFixed(5)}/message
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Role Distribution Pie Chart */}
      {roleData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Audience Breakdown by Role</CardTitle>
            <CardDescription>Distribution of messages by recipient role</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {roleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}