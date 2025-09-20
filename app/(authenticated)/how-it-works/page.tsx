'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FeatureCards } from '@/components/shared/feature-cards';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  FileText,
  Upload,
  Send,
  Eye,
  BarChart,
  Shield,
  Clock,
  Users,
  Brain,
  Zap,
  Terminal
} from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">How LinkedIn Messenger Works</h1>
        <p className="text-xl text-gray-600">
          AI-powered LinkedIn automation with GPT-5 Nano personalization
        </p>
      </div>

      {/* Important Notice */}
      <Alert className="mb-8 border-yellow-500 bg-yellow-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Important Notice:</strong> This tool automates LinkedIn messaging which may violate LinkedIn's Terms of Service.
          Built-in safety features like rate limiting, manual approval, and human-like behavior patterns help protect your account,
          but use at your own risk. Designed for internal team use with responsible practices.
        </AlertDescription>
      </Alert>

      {/* Core Features */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Core Features</h2>
        <FeatureCards />
      </div>

      {/* Step by Step Process */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-6">Step-by-Step Process</h2>
        <div className="grid gap-6">

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Upload className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Step 1: Import Connections</CardTitle>
                  <CardDescription>Export and upload your LinkedIn connections</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Export connections from LinkedIn (Data Privacy → Get a copy of your data)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Upload CSV file to the app</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Organize with tags and custom fields</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Brain className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Step 2: Create AI-Powered Campaign</CardTitle>
                  <CardDescription>Design templates with GPT-5 Nano personalization</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Create templates with variables: {`{{firstName}}`}, {`{{company}}`}, {`{{position}}`}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Enable AI personalization for unique opening lines</span>
                </li>
                <li className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>GPT-5 Nano generates context-aware content at $0.05/1M tokens</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Step 3: Target Recipients</CardTitle>
                  <CardDescription>Select connections for your campaign</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Filter by industry, location, company, or custom fields</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Add selected connections to campaign</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>System prevents duplicate messaging automatically</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Eye className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Step 4: Review & Approve</CardTitle>
                  <CardDescription>Quality control before automation</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Preview AI-personalized messages for each recipient</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Approve, reject, or edit individual messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Optional manual approval ensures quality control</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-yellow-100 p-2 rounded-lg">
                  <Terminal className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Step 5: Start Runner</CardTitle>
                  <CardDescription>Launch the LinkedIn automation runner</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Open terminal: <code className="bg-gray-100 px-2 py-1 rounded">cd runner && node run-local.js</code></span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Chrome browser opens with LinkedIn</span>
                </li>
                <li className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Log in once - session persists for future use</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <Zap className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Step 6: Automated Sending</CardTitle>
                  <CardDescription>Messages sent automatically with safety features</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Playwright automation</strong> sends messages through real browser</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Human-like delays (90+ seconds) between messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Rate limiting: 5/hour, 25/day default limits</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Screenshots captured for every message sent</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <BarChart className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Step 7: Monitor & Analyze</CardTitle>
                  <CardDescription>Track campaign performance in real-time</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Real-time dashboard shows progress</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>View message logs and screenshots</span>
                </li>
                <li className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Track AI performance and cost metrics</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Safety Features */}
      <Card className="mb-8 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Shield className="h-5 w-5" />
            Built-in Safety Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-900">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <span><strong>Rate Limiting:</strong> Configurable hourly/daily limits (default: 5/hr, 25/day)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <span><strong>Human Behavior:</strong> Random delays, mouse movements, scrolling patterns</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <span><strong>Session Persistence:</strong> Login once, no repeated logins</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <span><strong>Circuit Breaker:</strong> Auto-pause on errors or detection</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <span><strong>Quiet Hours:</strong> No messages during specified times</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <span><strong>Manual Approval:</strong> Optional review before sending</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Best Practices for Safe Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2 text-green-700">Recommended Do's</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Start with 3-5 messages/hour</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Use AI personalization for uniqueness</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Run during business hours only</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Monitor for LinkedIn warnings</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Provide value in your messages</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-red-700">Critical Don'ts</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Exceed 100 messages per week</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Use generic spam templates</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Ignore account warnings</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Run multiple accounts simultaneously</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Skip the manual approval step initially</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Architecture</CardTitle>
          <CardDescription>How the system works under the hood</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <Brain className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <span><strong>AI Engine:</strong> GPT-5 Nano for personalization ($0.05/1M tokens)</span>
            </li>
            <li className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <span><strong>Automation:</strong> Playwright controls real Chrome browser</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span><strong>Database:</strong> Supabase for secure data storage</span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span><strong>Queue System:</strong> Database-backed task processing</span>
            </li>
            <li className="flex items-start gap-2">
              <Terminal className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <span><strong>Runner:</strong> Local Node.js process with session persistence</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}