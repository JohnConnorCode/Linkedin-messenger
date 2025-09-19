import { MessageSquare, Users, Zap, Shield, ChartBar, Clock } from 'lucide-react';

export const features = [
  {
    icon: MessageSquare,
    iconColor: 'text-blue-500',
    title: 'Personalized Messages',
    description: 'Create message templates with variables that automatically personalize for each recipient using their LinkedIn data',
  },
  {
    icon: Users,
    iconColor: 'text-green-500',
    title: 'Smart Targeting',
    description: 'Import and manage your LinkedIn connections with tags, filters, and custom fields for targeted campaigns',
  },
  {
    icon: Zap,
    iconColor: 'text-purple-500',
    title: 'Semi-Automated Sending',
    description: 'Queue messages for manual approval before sending to maintain control and LinkedIn compliance',
  },
  {
    icon: Shield,
    iconColor: 'text-red-500',
    title: 'Safety Features',
    description: 'Built-in rate limiting and manual review steps to help protect your LinkedIn account',
  },
  {
    icon: ChartBar,
    iconColor: 'text-indigo-500',
    title: 'Campaign Analytics',
    description: 'Track sent messages, response rates, and campaign performance metrics',
  },
  {
    icon: Clock,
    iconColor: 'text-orange-500',
    title: 'Scheduled Campaigns',
    description: 'Set daily and hourly sending limits to control message flow and avoid spam triggers',
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