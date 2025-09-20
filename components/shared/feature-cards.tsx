import { MessageSquare, Users, Zap, Shield, ChartBar, Brain } from 'lucide-react';

export const features = [
  {
    icon: Brain,
    iconColor: 'text-purple-500',
    title: 'AI-Powered Personalization',
    description: 'GPT-5 Nano generates unique, context-aware messages for each recipient based on their profile and industry',
  },
  {
    icon: MessageSquare,
    iconColor: 'text-blue-500',
    title: 'Smart Templates',
    description: 'Dynamic templates with variables and AI-generated content that adapt to each connection automatically',
  },
  {
    icon: Users,
    iconColor: 'text-green-500',
    title: 'CSV Import & Targeting',
    description: 'Import LinkedIn connections via CSV and segment them for targeted, personalized campaigns',
  },
  {
    icon: Zap,
    iconColor: 'text-yellow-500',
    title: 'Automated Outreach',
    description: 'Browser automation with Playwright sends messages automatically while you focus on other tasks',
  },
  {
    icon: Shield,
    iconColor: 'text-red-500',
    title: 'Anti-Detection Safety',
    description: 'Human-like behavior patterns, rate limiting, random delays, and session persistence protect your account',
  },
  {
    icon: ChartBar,
    iconColor: 'text-indigo-500',
    title: 'Real-time Analytics',
    description: 'Monitor campaign performance, AI confidence scores, message success rates, and cost tracking',
  },
];

export function FeatureCards() {
  return (
    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {features.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
            <Icon className={`w-10 h-10 ${feature.iconColor} mb-3`} />
            <h3 className="font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-600 text-sm">{feature.description}</p>
          </div>
        );
      })}
    </div>
  );
}