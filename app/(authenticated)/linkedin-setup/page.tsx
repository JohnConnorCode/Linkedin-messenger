'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CookieExtractor } from '@/components/linkedin/cookie-extractor';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Pause,
  Chrome,
  Monitor,
  Wifi,
  WifiOff,
  Terminal,
  Bug,
  FileJson,
  HelpCircle
} from 'lucide-react';

export default function LinkedInSetupPage() {
  const [sessionStatus, setSessionStatus] = useState<'checking' | 'active' | 'expired' | 'none'>('checking');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [runnerStatus, setRunnerStatus] = useState<'stopped' | 'running' | 'error'>('stopped');
  const [debugMode, setDebugMode] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    checkSessionStatus();
    checkRunnerStatus();
  }, []);

  const checkSessionStatus = async () => {
    try {
      const response = await fetch('/api/linkedin/session-status');
      const data = await response.json();
      setSessionStatus(data.status);
    } catch (error) {
      setSessionStatus('none');
    }
  };

  const checkRunnerStatus = async () => {
    try {
      const response = await fetch('/api/runner/status');
      const data = await response.json();
      setRunnerStatus(data.status);
    } catch (error) {
      setRunnerStatus('stopped');
    }
  };


  const testConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/linkedin/test-connection', {
        method: 'POST',
      });
      const data = await response.json();

      setTestResult(data);

      if (data.success) {
        toast({
          title: 'Success',
          description: 'LinkedIn connection test passed!',
        });
      } else {
        toast({
          title: 'Test Failed',
          description: data.error || 'Could not connect to LinkedIn',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to test connection',
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const startRunner = async () => {
    try {
      const response = await fetch('/api/runner/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ debug: debugMode }),
      });

      if (!response.ok) throw new Error('Failed to start runner');

      setRunnerStatus('running');
      toast({
        title: 'Runner Started',
        description: 'LinkedIn automation runner is now active',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start runner',
        variant: 'destructive',
      });
    }
  };

  const stopRunner = async () => {
    try {
      const response = await fetch('/api/runner/stop', {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to stop runner');

      setRunnerStatus('stopped');
      toast({
        title: 'Runner Stopped',
        description: 'LinkedIn automation runner has been stopped',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to stop runner',
        variant: 'destructive',
      });
    }
  };

  const downloadSessionTemplate = () => {
    const template = {
      cookies: [
        {
          name: "li_at",
          value: "YOUR_LI_AT_COOKIE_VALUE",
          domain: ".linkedin.com",
          path: "/",
          httpOnly: true,
          secure: true
        },
        {
          name: "JSESSIONID",
          value: "YOUR_JSESSIONID_VALUE",
          domain: ".www.linkedin.com",
          path: "/",
          httpOnly: false,
          secure: true
        }
      ],
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      viewport: {
        width: 1366,
        height: 768
      }
    };

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'linkedin-session-template.json';
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">LinkedIn Setup & Configuration</h1>
        <p className="text-muted-foreground mt-2">
          Configure your LinkedIn session and manage the automation runner
        </p>
      </div>

      {/* Status Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Session Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {sessionStatus === 'active' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-semibold text-green-600">Active</span>
                </>
              ) : sessionStatus === 'expired' ? (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="font-semibold text-yellow-600">Expired</span>
                </>
              ) : sessionStatus === 'checking' ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
                  <span className="font-semibold text-blue-600">Checking...</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-semibold text-red-600">Not Configured</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sessionStatus === 'active' ? 'Ready to send messages' :
               sessionStatus === 'expired' ? 'Please update your session' :
               'Configure LinkedIn cookies'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Runner Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {runnerStatus === 'running' ? (
                <>
                  <Wifi className="h-5 w-5 text-green-500" />
                  <span className="font-semibold text-green-600">Running</span>
                </>
              ) : runnerStatus === 'error' ? (
                <>
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <span className="font-semibold text-red-600">Error</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-gray-500" />
                  <span className="font-semibold text-gray-600">Stopped</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {runnerStatus === 'running' ? 'Processing message queue' :
               'Not processing messages'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Connection Test</CardTitle>
          </CardHeader>
          <CardContent>
            {testResult ? (
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-semibold text-green-600">Passed</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-semibold text-red-600">Failed</span>
                  </>
                )}
              </div>
            ) : (
              <Button
                size="sm"
                onClick={testConnection}
                disabled={isTestingConnection || sessionStatus !== 'active'}
                className="w-full"
              >
                {isTestingConnection ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Test Connection
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="session" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="session">Session Setup</TabsTrigger>
          <TabsTrigger value="runner">Runner Control</TabsTrigger>
          <TabsTrigger value="debug">Debug Tools</TabsTrigger>
          <TabsTrigger value="guide">Setup Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="session" className="space-y-4">
          <CookieExtractor
            onSessionSaved={() => {
              checkSessionStatus();
              toast({
                title: 'Success',
                description: 'LinkedIn session has been saved and encrypted',
              });
            }}
          />
        </TabsContent>

        <TabsContent value="runner" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Runner Control Panel</CardTitle>
              <CardDescription>
                Manage the LinkedIn automation runner process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold">Automation Runner</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {runnerStatus === 'running'
                      ? 'Currently processing message queue'
                      : 'Click Start to begin processing'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {runnerStatus === 'running' ? (
                    <Button variant="destructive" onClick={stopRunner}>
                      <Pause className="h-4 w-4 mr-2" />
                      Stop Runner
                    </Button>
                  ) : (
                    <Button onClick={startRunner} disabled={sessionStatus !== 'active'}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Runner
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Processing Mode</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={!debugMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDebugMode(false)}
                    >
                      Production
                    </Button>
                    <Button
                      variant={debugMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDebugMode(true)}
                    >
                      Debug
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Browser Mode</Label>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {debugMode ? 'Visible (Debug)' : 'Headless (Production)'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Runner Information</AlertTitle>
                <AlertDescription>
                  The runner processes messages from the queue automatically. It includes anti-detection measures
                  and rate limiting to keep your account safe.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Runner Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Daily Message Limit</Label>
                  <Input value="50" disabled />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hourly Message Limit</Label>
                  <Input value="10" disabled />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Min Delay (seconds)</Label>
                  <Input value="30" disabled />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Delay (seconds)</Label>
                  <Input value="120" disabled />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                These limits are configured for optimal safety and cannot be changed.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Debug Tools</CardTitle>
              <CardDescription>
                Advanced tools for troubleshooting LinkedIn automation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-2">
                <Button variant="outline" onClick={testConnection}>
                  <Bug className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
                <Button variant="outline">
                  <FileJson className="h-4 w-4 mr-2" />
                  View Session Data
                </Button>
                <Button variant="outline">
                  <Terminal className="h-4 w-4 mr-2" />
                  View Runner Logs
                </Button>
                <Button variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear Cache
                </Button>
              </div>

              {testResult && (
                <Alert>
                  <AlertTitle>Connection Test Results</AlertTitle>
                  <AlertDescription>
                    <pre className="mt-2 text-xs bg-muted p-2 rounded">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Recent Logs</Label>
                <div className="h-[200px] overflow-y-auto bg-muted rounded p-3 font-mono text-xs">
                  {logs.length > 0 ? (
                    logs.map((log, i) => (
                      <div key={i} className="mb-1">{log}</div>
                    ))
                  ) : (
                    <span className="text-muted-foreground">No logs available</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complete Setup Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge>Step 1</Badge>
                    Configure LinkedIn Session
                  </h3>
                  <ol className="space-y-1 text-sm text-muted-foreground ml-4">
                    <li>• Login to LinkedIn in your browser</li>
                    <li>• Extract cookies using Developer Tools</li>
                    <li>• Save session in the Session Setup tab</li>
                    <li>• Test connection to verify it works</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge>Step 2</Badge>
                    Import Connections
                  </h3>
                  <ol className="space-y-1 text-sm text-muted-foreground ml-4">
                    <li>• Export connections from LinkedIn</li>
                    <li>• Go to Connections page</li>
                    <li>• Upload CSV file</li>
                    <li>• Verify import successful</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge>Step 3</Badge>
                    Create Campaign
                  </h3>
                  <ol className="space-y-1 text-sm text-muted-foreground ml-4">
                    <li>• Create message template</li>
                    <li>• Setup new campaign</li>
                    <li>• Select target connections</li>
                    <li>• Enable AI personalization</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Badge>Step 4</Badge>
                    Start Automation
                  </h3>
                  <ol className="space-y-1 text-sm text-muted-foreground ml-4">
                    <li>• Review messages in approval queue</li>
                    <li>• Approve messages to send</li>
                    <li>• Start runner from Runner Control tab</li>
                    <li>• Monitor progress in dashboard</li>
                  </ol>
                </div>
              </div>

              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertTitle>Need Help?</AlertTitle>
                <AlertDescription>
                  Check the documentation or contact support if you encounter any issues during setup.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}