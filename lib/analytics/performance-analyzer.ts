import { createClient } from '@supabase/supabase-js';

export interface CampaignMetrics {
  campaignId: string;
  totalTargets: number;
  messagesSent: number;
  messagesApproved: number;
  messagesPending: number;
  avgConfidenceScore: number;
  successRate: number;
  responseRate: number;
  costPerMessage: number;
  totalCost: number;
  bestPerformingTime: string;
  bestPerformingDay: string;
  industryPerformance: Record<string, number>;
  rolePerformance: Record<string, number>;
}

export interface PerformanceRecommendation {
  id: string;
  type: 'timing' | 'targeting' | 'content' | 'ai' | 'budget' | 'strategy';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  actionable: boolean;
  estimatedImprovement?: number;
  suggestedAction?: string;
  data?: any;
}

export class PerformanceAnalyzer {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  async analyzeCampaign(campaignId: string): Promise<{
    metrics: CampaignMetrics;
    recommendations: PerformanceRecommendation[];
  }> {
    // Fetch campaign data
    const [campaign, targets, logs, aiQueue] = await Promise.all([
      this.fetchCampaignData(campaignId),
      this.fetchTargetData(campaignId),
      this.fetchSendLogs(campaignId),
      this.fetchAIPerformance(campaignId)
    ]);

    // Calculate metrics
    const metrics = this.calculateMetrics(campaign, targets, logs, aiQueue);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(metrics, campaign, targets, logs, aiQueue);

    return { metrics, recommendations };
  }

  private async fetchCampaignData(campaignId: string) {
    const { data } = await this.supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();
    return data;
  }

  private async fetchTargetData(campaignId: string) {
    const { data } = await this.supabase
      .from('campaign_targets')
      .select(`
        *,
        connections(
          company,
          headline,
          location,
          industry
        )
      `)
      .eq('campaign_id', campaignId);
    return data || [];
  }

  private async fetchSendLogs(campaignId: string) {
    const { data } = await this.supabase
      .from('send_logs')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('sent_at', { ascending: false });
    return data || [];
  }

  private async fetchAIPerformance(campaignId: string) {
    const { data } = await this.supabase
      .from('ai_personalization_queue')
      .select('*')
      .eq('campaign_id', campaignId);
    return data || [];
  }

  private calculateMetrics(
    campaign: any,
    targets: any[],
    logs: any[],
    aiQueue: any[]
  ): CampaignMetrics {
    const totalTargets = targets.length;
    const messagesSent = logs.filter(l => l.status === 'sent').length;
    const messagesApproved = targets.filter(t => t.approval_status === 'approved').length;
    const messagesPending = targets.filter(t => t.approval_status === 'pending').length;

    // Calculate average confidence score
    const confidenceScores = aiQueue.map(q => q.confidence_score).filter(Boolean);
    const avgConfidenceScore = confidenceScores.length > 0
      ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
      : 0;

    // Calculate success rate
    const successfulSends = logs.filter(l => l.status === 'sent').length;
    const totalAttempts = logs.length;
    const successRate = totalAttempts > 0 ? successfulSends / totalAttempts : 0;

    // Calculate response rate (simulated for now)
    const responses = logs.filter(l => l.response_received).length;
    const responseRate = messagesSent > 0 ? responses / messagesSent : 0;

    // Calculate costs (based on GPT-5 Nano pricing)
    const aiProcessed = aiQueue.filter(q => q.status === 'completed').length;
    const costPerMessage = 0.00005; // $0.05 per 1M tokens, estimated 1000 tokens per message
    const totalCost = aiProcessed * costPerMessage;

    // Analyze best performing times
    const timePerformance = this.analyzeTimePerformance(logs);
    const dayPerformance = this.analyzeDayPerformance(logs);

    // Analyze performance by industry and role
    const industryPerformance = this.analyzeIndustryPerformance(targets, logs);
    const rolePerformance = this.analyzeRolePerformance(targets, logs);

    return {
      campaignId: campaign.id,
      totalTargets,
      messagesSent,
      messagesApproved,
      messagesPending,
      avgConfidenceScore,
      successRate,
      responseRate,
      costPerMessage,
      totalCost,
      bestPerformingTime: timePerformance.bestTime || '10:00 AM',
      bestPerformingDay: dayPerformance.bestDay || 'Tuesday',
      industryPerformance,
      rolePerformance
    };
  }

  private analyzeTimePerformance(logs: any[]) {
    const timeSlots: Record<string, number> = {};

    logs.forEach(log => {
      if (log.sent_at && log.response_received) {
        const hour = new Date(log.sent_at).getHours();
        const slot = `${hour}:00`;
        timeSlots[slot] = (timeSlots[slot] || 0) + 1;
      }
    });

    const bestTime = Object.entries(timeSlots)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    return { bestTime, timeSlots };
  }

  private analyzeDayPerformance(logs: any[]) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayPerformance: Record<string, number> = {};

    logs.forEach(log => {
      if (log.sent_at && log.response_received) {
        const dayName = days[new Date(log.sent_at).getDay()];
        dayPerformance[dayName] = (dayPerformance[dayName] || 0) + 1;
      }
    });

    const bestDay = Object.entries(dayPerformance)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    return { bestDay, dayPerformance };
  }

  private analyzeIndustryPerformance(targets: any[], logs: any[]) {
    const performance: Record<string, number> = {};
    const sentTargetIds = new Set(logs.filter(l => l.status === 'sent').map(l => l.target_id));

    targets.forEach(target => {
      if (sentTargetIds.has(target.id) && target.connections?.industry) {
        const industry = target.connections.industry;
        performance[industry] = (performance[industry] || 0) + 1;
      }
    });

    return performance;
  }

  private analyzeRolePerformance(targets: any[], logs: any[]) {
    const performance: Record<string, number> = {};
    const sentTargetIds = new Set(logs.filter(l => l.status === 'sent').map(l => l.target_id));

    targets.forEach(target => {
      if (sentTargetIds.has(target.id) && target.connections?.headline) {
        // Extract common role keywords
        const headline = target.connections.headline.toLowerCase();
        let role = 'Other';

        if (headline.includes('ceo') || headline.includes('founder')) role = 'Executive';
        else if (headline.includes('manager') || headline.includes('director')) role = 'Management';
        else if (headline.includes('engineer') || headline.includes('developer')) role = 'Technical';
        else if (headline.includes('sales') || headline.includes('marketing')) role = 'Sales/Marketing';

        performance[role] = (performance[role] || 0) + 1;
      }
    });

    return performance;
  }

  private async generateRecommendations(
    metrics: CampaignMetrics,
    campaign: any,
    targets: any[],
    logs: any[],
    aiQueue: any[]
  ): Promise<PerformanceRecommendation[]> {
    const recommendations: PerformanceRecommendation[] = [];

    // 1. Timing Recommendations
    if (metrics.bestPerformingTime) {
      recommendations.push({
        id: 'timing-1',
        type: 'timing',
        priority: 'high',
        title: 'Optimize Send Times',
        description: `Your messages perform best at ${metrics.bestPerformingTime}. Consider scheduling more messages during this time window.`,
        impact: 'Could improve response rate by up to 25%',
        actionable: true,
        estimatedImprovement: 25,
        suggestedAction: `Update campaign schedule to focus on ${metrics.bestPerformingTime}`,
        data: { bestTime: metrics.bestPerformingTime }
      });
    }

    // 2. Confidence Score Recommendations
    if (metrics.avgConfidenceScore < 0.8) {
      recommendations.push({
        id: 'ai-1',
        type: 'ai',
        priority: 'high',
        title: 'Improve AI Personalization',
        description: `Average confidence score is ${(metrics.avgConfidenceScore * 100).toFixed(1)}%. Consider enriching profile data or adjusting AI parameters.`,
        impact: 'Higher confidence scores correlate with better engagement',
        actionable: true,
        estimatedImprovement: 30,
        suggestedAction: 'Enable profile scraping for more detailed personalization'
      });
    } else if (metrics.avgConfidenceScore > 0.9) {
      recommendations.push({
        id: 'ai-2',
        type: 'ai',
        priority: 'low',
        title: 'Consider Auto-Approval',
        description: `With ${(metrics.avgConfidenceScore * 100).toFixed(1)}% average confidence, you could enable auto-approval for messages above 90%.`,
        impact: 'Save time on manual approvals',
        actionable: true,
        suggestedAction: 'Enable auto-approval for high-confidence messages'
      });
    }

    // 3. Targeting Recommendations
    const topIndustries = Object.entries(metrics.industryPerformance)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (topIndustries.length > 0) {
      recommendations.push({
        id: 'targeting-1',
        type: 'targeting',
        priority: 'medium',
        title: 'Focus on High-Performing Industries',
        description: `Best performance in: ${topIndustries.map(([ind]) => ind).join(', ')}. Consider targeting similar profiles.`,
        impact: 'Improve overall campaign effectiveness',
        actionable: true,
        data: { topIndustries }
      });
    }

    // 4. Budget Recommendations
    if (metrics.costPerMessage > 0.00010) {
      recommendations.push({
        id: 'budget-1',
        type: 'budget',
        priority: 'medium',
        title: 'Optimize AI Usage',
        description: `Cost per message is higher than average. Consider using templates for common scenarios.`,
        impact: `Could reduce costs by up to 40%`,
        actionable: true,
        estimatedImprovement: 40,
        suggestedAction: 'Create template variations for common personas'
      });
    }

    // 5. Content Recommendations
    if (metrics.responseRate < 0.1) {
      recommendations.push({
        id: 'content-1',
        type: 'content',
        priority: 'high',
        title: 'Improve Message Content',
        description: `Response rate is ${(metrics.responseRate * 100).toFixed(1)}%. Consider A/B testing different message templates.`,
        impact: 'Could double your response rate',
        actionable: true,
        estimatedImprovement: 100,
        suggestedAction: 'Create message variants for A/B testing'
      });
    }

    // 6. Strategy Recommendations
    if (metrics.messagesPending > metrics.messagesApproved) {
      recommendations.push({
        id: 'strategy-1',
        type: 'strategy',
        priority: 'high',
        title: 'Clear Approval Backlog',
        description: `${metrics.messagesPending} messages pending approval. Use bulk approval for high-confidence messages.`,
        impact: 'Accelerate campaign progress',
        actionable: true,
        suggestedAction: 'Review and bulk approve messages above 85% confidence'
      });
    }

    // 7. Day of Week Recommendations
    if (metrics.bestPerformingDay) {
      const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      if (weekdays.includes(metrics.bestPerformingDay)) {
        recommendations.push({
          id: 'timing-2',
          type: 'timing',
          priority: 'medium',
          title: 'Optimize Day Distribution',
          description: `${metrics.bestPerformingDay} shows best engagement. Avoid weekends for B2B outreach.`,
          impact: 'Improve engagement by 15-20%',
          actionable: true,
          estimatedImprovement: 17,
          data: { bestDay: metrics.bestPerformingDay }
        });
      }
    }

    // Sort by priority
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // Get historical performance trends
  async getPerformanceTrends(campaignId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: dailyStats } = await this.supabase
      .from('send_logs')
      .select('sent_at, status, response_received')
      .eq('campaign_id', campaignId)
      .gte('sent_at', startDate.toISOString())
      .order('sent_at', { ascending: true });

    // Group by day
    const trends: Record<string, any> = {};

    (dailyStats || []).forEach(stat => {
      const date = new Date(stat.sent_at).toISOString().split('T')[0];
      if (!trends[date]) {
        trends[date] = {
          sent: 0,
          failed: 0,
          responses: 0
        };
      }

      if (stat.status === 'sent') trends[date].sent++;
      else if (stat.status === 'failed') trends[date].failed++;
      if (stat.response_received) trends[date].responses++;
    });

    return Object.entries(trends).map(([date, stats]) => ({
      date,
      ...stats,
      responseRate: stats.sent > 0 ? stats.responses / stats.sent : 0
    }));
  }

  // Compare campaign performance
  async compareCampaigns(campaignIds: string[]) {
    const comparisons = await Promise.all(
      campaignIds.map(id => this.analyzeCampaign(id))
    );

    return comparisons.map(({ metrics, recommendations }) => ({
      campaignId: metrics.campaignId,
      metrics,
      score: this.calculatePerformanceScore(metrics),
      topRecommendation: recommendations[0]
    }));
  }

  private calculatePerformanceScore(metrics: CampaignMetrics): number {
    // Weighted score based on key metrics
    const weights = {
      successRate: 0.25,
      responseRate: 0.35,
      confidenceScore: 0.2,
      costEfficiency: 0.2
    };

    const costEfficiency = metrics.costPerMessage > 0
      ? Math.min(1, 0.00005 / metrics.costPerMessage)
      : 1;

    const score =
      (metrics.successRate * weights.successRate) +
      (metrics.responseRate * weights.responseRate) +
      (metrics.avgConfidenceScore * weights.confidenceScore) +
      (costEfficiency * weights.costEfficiency);

    return Math.round(score * 100);
  }
}