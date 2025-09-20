import { createServerComponentClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default async function RunnerPage() {
  const supabase = await createServerComponentClient();

  const { data: linkedinAccount } = (await supabase
    .from('linkedin_accounts')
    .select('*')
    .single()) as { data: any };

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'invalid':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">LinkedIn Runner</h1>
        <p className="text-muted-foreground mt-2">
          Browser automation for sending LinkedIn messages with AI personalization
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>LinkedIn Session Status</CardTitle>
              {getStatusIcon(linkedinAccount?.status)}
            </div>
            <Badge
              variant={linkedinAccount?.status === 'connected' ? 'default' : 'secondary'}
            >
              {linkedinAccount?.status || 'Not configured'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {linkedinAccount?.status === 'connected' ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Last checked: {linkedinAccount.last_check_at
                  ? new Date(linkedinAccount.last_check_at).toLocaleString()
                  : 'Never'}
              </p>
              <p className="text-sm text-muted-foreground">
                Runner instance: {linkedinAccount.runner_instance || 'Default'}
              </p>
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Status
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm">
                To connect your LinkedIn account, you need to log in through the runner.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start Instructions</CardTitle>
          <CardDescription>
            Follow these steps to start the LinkedIn automation runner
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>
              <strong>Start the Runner</strong>
              <p className="text-muted-foreground ml-6 mt-1">
                Ensure the Playwright runner is running with headful Chrome
              </p>
              <code className="block bg-muted px-3 py-2 rounded mt-2 ml-6 text-xs">
                cd runner && npm start
              </code>
            </li>

            <li>
              <strong>Access the Browser</strong>
              <p className="text-muted-foreground ml-6 mt-1">
                The runner will open a Chrome window. Navigate to LinkedIn.com
              </p>
            </li>

            <li>
              <strong>Log Into LinkedIn</strong>
              <p className="text-muted-foreground ml-6 mt-1">
                Sign in with your LinkedIn credentials. Complete 2FA if required
              </p>
            </li>

            <li>
              <strong>Verify Connection</strong>
              <p className="text-muted-foreground ml-6 mt-1">
                Once logged in, the session will be persisted. Click &quot;Check Status&quot; above to verify
              </p>
            </li>
          </ol>

          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Security Notes
                </p>
                <ul className="mt-2 space-y-1 text-yellow-700 dark:text-yellow-300">
                  <li>• Never share your runner&apos;s session directory</li>
                  <li>• Use a dedicated LinkedIn account if possible</li>
                  <li>• Keep the runner on a secure, private network</li>
                  <li>• Rotate sessions periodically for security</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Runner Token</CardTitle>
          <CardDescription>
            Use this token to authenticate your runner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <code className="block bg-muted px-3 py-2 rounded text-xs break-all">
              {`RUNNER_TOKEN=<generate-from-settings>`}
            </code>
            <p className="text-xs text-muted-foreground">
              Add this to your runner&apos;s .env file
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}