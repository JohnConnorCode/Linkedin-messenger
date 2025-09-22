'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  Github,
  Terminal,
  Globe,
  Key,
  Database,
  CheckCircle2,
  Copy,
  ExternalLink,
  AlertCircle,
  Rocket,
  Settings,
  PlayCircle,
  FileCode,
  Shield,
  Zap
} from 'lucide-react';

export default function SetupPage() {
  const [copiedText, setCopiedText] = useState<string>('');

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3">Complete Setup Guide</h1>
        <p className="text-lg text-muted-foreground">
          Set up LinkedIn Messenger with both web app and desktop automation runner
        </p>
      </div>

      <Alert className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
        <Zap className="h-4 w-4" />
        <AlertDescription>
          <strong>System Architecture:</strong> The web app manages campaigns and data, while the desktop runner executes LinkedIn automation locally to avoid detection.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="web-setup">Web App</TabsTrigger>
          <TabsTrigger value="runner-setup">Desktop Runner</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="usage">How to Use</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                System Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4 text-blue-500" />
                      Web Application (Vercel/Cloud)
                    </h3>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Campaign management dashboard</li>
                      <li>• Target list management</li>
                      <li>• AI message personalization</li>
                      <li>• Analytics and monitoring</li>
                      <li>• Cookie extraction tool</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <h3 className="font-semibold flex items-center gap-2 mb-2">
                      <Terminal className="h-4 w-4 text-green-500" />
                      Desktop Runner (Local Machine)
                    </h3>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Executes LinkedIn automation</li>
                      <li>• Uses residential IP (avoids detection)</li>
                      <li>• Human-like behavior simulation</li>
                      <li>• Real-time database sync</li>
                      <li>• Anti-detection measures</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Why two components?</strong> LinkedIn blocks cloud IPs (AWS, Vercel, etc.).
                  The desktop runner uses your home IP address, making it undetectable while the web app provides a powerful management interface.
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => window.open('https://github.com/JohnConnorCode/Linkedin-messenger', '_blank')}
                  className="gap-2"
                >
                  <Github className="h-4 w-4" />
                  View on GitHub
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://github.com/JohnConnorCode/Linkedin-messenger/issues', '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Report Issues
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Web Setup Tab */}
        <TabsContent value="web-setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Web Application Setup</CardTitle>
              <CardDescription>Deploy to Vercel or run locally</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Option 1: Deploy to Vercel (Recommended)</h3>

                <div className="pl-4 space-y-3">
                  <div className="flex gap-3">
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">1</span>
                    <div className="flex-1">
                      <p className="text-sm">Fork the repository</p>
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('https://github.com/JohnConnorCode/Linkedin-messenger/fork', '_blank')}
                          className="gap-2"
                        >
                          <Github className="h-3 w-3" />
                          Fork on GitHub
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">2</span>
                    <div className="flex-1">
                      <p className="text-sm">Import to Vercel</p>
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('https://vercel.com/new', '_blank')}
                          className="gap-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Go to Vercel
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">3</span>
                    <div className="flex-1">
                      <p className="text-sm">Add environment variables (see Environment tab)</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">4</span>
                    <div className="flex-1">
                      <p className="text-sm">Deploy and get your URL</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold">Option 2: Run Locally</h3>

                  <div className="mt-4 space-y-3">
                    <div className="bg-muted p-3 rounded font-mono text-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-muted-foreground">Clone repository</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard('git clone https://github.com/JohnConnorCode/Linkedin-messenger.git', 'clone')}
                        >
                          {copiedText === 'clone' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      git clone https://github.com/JohnConnorCode/Linkedin-messenger.git
                    </div>

                    <div className="bg-muted p-3 rounded font-mono text-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-muted-foreground">Install dependencies</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard('cd Linkedin-messenger && npm install', 'install')}
                        >
                          {copiedText === 'install' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      cd Linkedin-messenger && npm install
                    </div>

                    <div className="bg-muted p-3 rounded font-mono text-sm">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-muted-foreground">Start development server</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard('npm run dev', 'dev')}
                        >
                          {copiedText === 'dev' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      npm run dev
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mt-3">
                    Access at: <code className="bg-muted px-2 py-1 rounded">http://localhost:3000</code>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Runner Setup Tab */}
        <TabsContent value="runner-setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Desktop Runner Setup</CardTitle>
              <CardDescription>Local LinkedIn automation engine</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> The runner must run on your local machine, not on cloud servers.
                  LinkedIn detects and blocks cloud IPs.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-semibold">Prerequisites</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Node.js 18+ installed
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Chrome/Chromium browser
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    LinkedIn account with cookies extracted
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Stable internet connection
                  </li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Installation Steps</h3>

                <div className="space-y-3">
                  <div className="bg-muted p-3 rounded font-mono text-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-muted-foreground">Step 1: Navigate to runner directory</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('cd Linkedin-messenger/runner', 'runner-cd')}
                      >
                        {copiedText === 'runner-cd' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    cd Linkedin-messenger/runner
                  </div>

                  <div className="bg-muted p-3 rounded font-mono text-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-muted-foreground">Step 2: Install runner dependencies</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('npm install', 'runner-install')}
                      >
                        {copiedText === 'runner-install' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    npm install
                  </div>

                  <div className="bg-muted p-3 rounded font-mono text-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-muted-foreground">Step 3: Create .env file with database credentials</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('cp .env.example .env', 'runner-env')}
                      >
                        {copiedText === 'runner-env' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    cp .env.example .env
                  </div>

                  <div className="bg-muted p-3 rounded font-mono text-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-muted-foreground">Step 4: Start the runner</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('npm start', 'runner-start')}
                      >
                        {copiedText === 'runner-start' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    npm start
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Runner Features</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Anti-Detection</p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• Random delays (2-7 seconds)</li>
                      <li>• Human-like mouse movements</li>
                      <li>• Typing speed variation</li>
                      <li>• Session fingerprinting</li>
                    </ul>
                  </div>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Rate Limiting</p>
                    <ul className="text-muted-foreground space-y-1">
                      <li>• 50 messages daily cap</li>
                      <li>• 10 messages hourly cap</li>
                      <li>• Circuit breaker protection</li>
                      <li>• Automatic retry logic</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Environment Tab */}
        <TabsContent value="environment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Environment Configuration</CardTitle>
              <CardDescription>Required environment variables for both components</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Supabase Configuration
                </h3>

                <div className="space-y-3">
                  <Alert>
                    <AlertDescription>
                      Get these from your Supabase project:
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => window.open('https://app.supabase.com', '_blank')}
                        className="px-1"
                      >
                        app.supabase.com
                      </Button>
                      → Settings → API
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="text-sm font-mono">NEXT_PUBLIC_SUPABASE_URL</code>
                        <p className="text-xs text-muted-foreground mt-1">Your Supabase project URL</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co', 'url')}
                      >
                        {copiedText === 'url' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="text-sm font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
                        <p className="text-xs text-muted-foreground mt-1">Public anonymous key</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key', 'anon')}
                      >
                        {copiedText === 'anon' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="text-sm font-mono">SUPABASE_SERVICE_ROLE_KEY</code>
                        <p className="text-xs text-muted-foreground mt-1">Service role key (keep secret!)</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('SUPABASE_SERVICE_ROLE_KEY=your-service-key', 'service')}
                      >
                        {copiedText === 'service' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Additional Configuration
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="text-sm font-mono">OPENAI_API_KEY</code>
                        <p className="text-xs text-muted-foreground mt-1">For GPT-5 Nano personalization</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('OPENAI_API_KEY=sk-...', 'openai')}
                      >
                        {copiedText === 'openai' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="text-sm font-mono">ENCRYPTION_KEY</code>
                        <p className="text-xs text-muted-foreground mt-1">For encrypting LinkedIn cookies</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('openssl rand -base64 32', 'encrypt')}
                      >
                        {copiedText === 'encrypt' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-muted rounded">
                  <h4 className="font-semibold text-sm mb-2">Example .env.local file:</h4>
                  <pre className="text-xs font-mono overflow-x-auto">
{`# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# OpenAI
OPENAI_API_KEY=sk-...

# Encryption
ENCRYPTION_KEY=your-32-byte-base64-key`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>How to Use LinkedIn Messenger</CardTitle>
              <CardDescription>Step-by-step guide to running campaigns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Quick Start Workflow</h3>

                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
                          1
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">Extract LinkedIn Cookies</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Go to Settings → LinkedIn Setup → Extract cookies from your browser
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
                          2
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">Create a Campaign</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Navigate to Campaigns → New Campaign → Set up your message template with variables
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
                          3
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">Upload Target List</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Upload CSV with LinkedIn profiles or add targets manually
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-semibold">
                          4
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">Start Desktop Runner</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          On your local machine: <code className="bg-muted px-2 py-1 rounded text-xs">cd runner && npm start</code>
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-semibold">
                          5
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">Monitor Progress</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Watch real-time updates in Campaign Control Center
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Message Variables</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-3 border rounded">
                      <code className="text-sm font-mono">{'{firstName}'}</code>
                      <p className="text-xs text-muted-foreground mt-1">Target\'s first name</p>
                    </div>
                    <div className="p-3 border rounded">
                      <code className="text-sm font-mono">{'{company}'}</code>
                      <p className="text-xs text-muted-foreground mt-1">Current company name</p>
                    </div>
                    <div className="p-3 border rounded">
                      <code className="text-sm font-mono">{'{position}'}</code>
                      <p className="text-xs text-muted-foreground mt-1">Job title/position</p>
                    </div>
                    <div className="p-3 border rounded">
                      <code className="text-sm font-mono">{'{location}'}</code>
                      <p className="text-xs text-muted-foreground mt-1">Geographic location</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Tips & Best Practices</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <p>Keep messages under 300 characters for better engagement</p>
                    </div>
                    <div className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <p>Run the desktop runner during business hours for natural activity</p>
                    </div>
                    <div className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <p>Start with small batches (10-20) to test your templates</p>
                    </div>
                    <div className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <p>Use AI personalization for higher response rates</p>
                    </div>
                    <div className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                      <p>Monitor the approval queue regularly for quality control</p>
                    </div>
                  </div>
                </div>

                <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
                  <PlayCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Ready to start?</strong> The system is fully set up and tested.
                    Begin with a test campaign to familiarize yourself with the workflow.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-4">
                  <Button onClick={() => window.location.href = '/campaigns/new'}>
                    Create First Campaign
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/settings/linkedin'}
                  >
                    <Key className="h-4 w-4 mr-2" />
                    Setup LinkedIn
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}