'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Rocket,
  Shield,
  Cpu,
  MessageSquare,
  Users,
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  Settings
} from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Help & Documentation</h1>
        <p className="text-muted-foreground mt-2">
          Everything you need to know about LinkedIn Messenger v1.0
        </p>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Quick Start Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-semibold">1. Create a Campaign</h4>
                <p className="text-sm text-muted-foreground">
                  Go to Campaigns → New Campaign. Set your message template with variables like {'{{firstName}}'} and {'{{company}}'}.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-semibold">2. Import Connections</h4>
                <p className="text-sm text-muted-foreground">
                  Export your LinkedIn connections as CSV and import them. Map the columns to our fields.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-semibold">3. Enable AI Personalization</h4>
                <p className="text-sm text-muted-foreground">
                  Turn on GPT-5 Nano to generate personalized opening lines. Cost: $0.05 per 1M tokens.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-semibold">4. Start the Runner</h4>
                <p className="text-sm text-muted-foreground">
                  Open terminal: <code className="bg-muted px-2 py-1 rounded">cd runner && node run-local.js</code>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-semibold">5. Login to LinkedIn</h4>
                <p className="text-sm text-muted-foreground">
                  When the browser opens, log into LinkedIn. Your session will be saved for future use.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-semibold">6. Launch Campaign</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Start Campaign" in the dashboard. Messages will be sent with configured delays.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              AI Personalization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">Powered by GPT-5 Nano for intelligent message customization:</p>
            <ul className="text-sm space-y-1 ml-4">
              <li>• Professional, Friendly, or Casual tone</li>
              <li>• Context-aware opening lines</li>
              <li>• Profile-based personalization</li>
              <li>• Industry-specific messaging</li>
              <li>• Cost: $0.05 per 1M tokens</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Safety Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">Built-in protection for your LinkedIn account:</p>
            <ul className="text-sm space-y-1 ml-4">
              <li>• Rate limiting: 5/hr, 25/day defaults</li>
              <li>• Human-like delays (90+ seconds)</li>
              <li>• Random jitter (0-5 seconds)</li>
              <li>• Quiet hours enforcement</li>
              <li>• Circuit breaker on errors</li>
              <li>• Session persistence</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Message Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">Use Mustache syntax for dynamic content:</p>
            <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`Hi {{firstName}},

I noticed you work at {{company}}
as {{position}}.

{{ai_personalized_line}}

Would love to connect!

Best,
{{senderName}}`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2 text-sm">
              <div>
                <strong>App URL:</strong> http://localhost:8082
              </div>
              <div>
                <strong>Database:</strong> Supabase (configured)
              </div>
              <div>
                <strong>AI Model:</strong> GPT-5 Nano (when available)
              </div>
              <div>
                <strong>Browser:</strong> Chromium via Playwright
              </div>
              <div>
                <strong>Session Storage:</strong> runner/linkedin-sessions
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Troubleshooting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold">Browser won't launch</h4>
              <p className="text-sm text-muted-foreground">
                Run: <code className="bg-muted px-2 py-1 rounded">cd runner && npx playwright install chromium</code>
              </p>
            </div>

            <div>
              <h4 className="font-semibold">OpenAI errors</h4>
              <p className="text-sm text-muted-foreground">
                Check your API key in <code className="bg-muted px-2 py-1 rounded">.env.local</code> and verify billing is active.
              </p>
            </div>

            <div>
              <h4 className="font-semibold">LinkedIn detection</h4>
              <p className="text-sm text-muted-foreground">
                Reduce rate limits, increase delays, or wait 24 hours before retrying.
              </p>
            </div>

            <div>
              <h4 className="font-semibold">Database connection issues</h4>
              <p className="text-sm text-muted-foreground">
                Verify Supabase is accessible. Run: <code className="bg-muted px-2 py-1 rounded">node production-check.js</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commands Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Commands Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
{`# Development
npm run dev                    # Start app on port 8082
cd runner && node run-local.js # Start runner with UI

# Production
npm run build                  # Build for production
npm run pm2:start              # Start with PM2
HEADLESS_MODE=true node runner/index-production.js

# Testing
node test-complete-system.js  # Full system test
node production-check.js      # Production readiness
cd runner && node verify-setup.js

# Maintenance
npx supabase db push          # Apply migrations
npm audit fix --force         # Fix vulnerabilities`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
            <AlertTriangle className="h-5 w-5" />
            LinkedIn Terms of Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            This tool automates LinkedIn messaging which may violate their Terms of Service.
            Your account could be restricted or banned. We've implemented safety features,
            but detection is always possible. Use conservative settings and monitor your account.
          </p>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">For internal team support:</p>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => window.location.href = '/dashboard'}>
              <PlayCircle className="h-4 w-4 mr-2" />
              View Dashboard Logs
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => window.open('http://localhost:8082/api/health', '_blank')}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Check System Health
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}