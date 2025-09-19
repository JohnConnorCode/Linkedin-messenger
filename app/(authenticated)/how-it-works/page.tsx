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
  Users
} from 'lucide-react';

export default function HowItWorksPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">How LinkedIn Messenger Works</h1>
        <p className="text-xl text-gray-600">
          A transparent guide to using our LinkedIn outreach tool responsibly
        </p>
      </div>

      {/* Important Notice */}
      <Alert className="mb-8 border-yellow-500 bg-yellow-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Legal Disclaimer:</strong> This tool assists with LinkedIn messaging but does NOT fully automate it.
          LinkedIn prohibits automated messaging in their Terms of Service. All messages require manual review and sending.
          Use of this tool is at your own risk, and we recommend reviewing LinkedIn's User Agreement.
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
                  <CardDescription>Manually export and upload your LinkedIn connections</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Export your connections from LinkedIn (Settings & Privacy → Data Privacy → Get a copy of your data)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Upload the CSV file to our system</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Add tags and custom fields to organize contacts</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Step 2: Create Message Templates</CardTitle>
                  <CardDescription>Design personalized message templates with variables</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Write message templates using variables like {`{{firstName}}`}, {`{{company}}`}, {`{{headline}}`}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Preview how messages will look for each recipient</span>
                </li>
                <li className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Templates are saved for reuse across campaigns</span>
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
                  <CardTitle className="text-lg">Step 3: Select Recipients</CardTitle>
                  <CardDescription>Choose who will receive your messages</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Filter connections by tags, location, company, or custom fields</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Review recipient list before creating campaign</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span>System tracks previously messaged contacts to avoid duplicates</span>
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
                  <CardTitle className="text-lg">Step 4: Review & Approve Messages</CardTitle>
                  <CardDescription>Manually review each personalized message before sending</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Each message is generated with recipient's actual data</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Approve, reject, or edit individual messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>This manual step ensures compliance and quality control</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-lg">
                  <Send className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Step 5: Manual Sending</CardTitle>
                  <CardDescription>You manually send approved messages on LinkedIn</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span><strong>Important:</strong> This tool does NOT send messages automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Copy approved messages and paste them into LinkedIn manually</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                  <span>Mark messages as "sent" in the system for tracking</span>
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
                  <CardTitle className="text-lg">Step 6: Track Performance</CardTitle>
                  <CardDescription>Monitor your campaign results</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Track which messages have been sent</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Log responses manually when received</span>
                </li>
                <li className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>View campaign statistics and response rates</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* What This Tool Does NOT Do */}
      <Card className="mb-8 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="h-5 w-5" />
            What This Tool Does NOT Do
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-red-900">
            <li className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span>Does NOT automatically send messages on LinkedIn</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span>Does NOT access your LinkedIn account directly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span>Does NOT scrape or crawl LinkedIn profiles</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span>Does NOT bypass LinkedIn's rate limits or security measures</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span>Does NOT guarantee delivery or response rates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span>Does NOT track opens or clicks (LinkedIn doesn't provide this data)</span>
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
              <h4 className="font-semibold mb-2 text-green-700">Do's</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Keep messages personalized and relevant</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Limit to 20-30 messages per day</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Space out messages throughout the day</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Review LinkedIn's Terms of Service regularly</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Provide value in your messages</span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-red-700">Don'ts</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Send more than 100 messages per week</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Use generic, spammy templates</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Message people you don't know</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Ignore LinkedIn warnings or restrictions</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>Share login credentials with anyone</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Implementation</CardTitle>
          <CardDescription>How we keep your data secure and maintain compliance</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span><strong>Data Storage:</strong> Your connections and messages are stored in encrypted Supabase databases</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span><strong>No LinkedIn Access:</strong> We never ask for or store your LinkedIn credentials</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span><strong>Manual Process:</strong> All LinkedIn interactions remain manual to comply with ToS</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span><strong>Rate Limiting:</strong> Built-in limits prevent accidental spam behavior</span>
            </li>
            <li className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <span><strong>Open Source:</strong> Our codebase is transparent and auditable</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}