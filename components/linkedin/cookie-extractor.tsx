'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Chrome,
  Cookie,
  Copy,
  Check,
  AlertCircle,
  Shield,
  Loader2,
  ExternalLink,
  Key,
  FileJson,
  Code2,
  Sparkles,
  Info,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface LinkedInCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly: boolean;
  secure: boolean;
}

interface ExtractedSession {
  cookies: LinkedInCookie[];
  userAgent: string;
  extractedAt: string;
  isValid: boolean;
}

export function CookieExtractor({ onSessionSaved }: { onSessionSaved?: () => void }) {
  const [extractionMethod, setExtractionMethod] = useState<'auto' | 'manual' | 'extension'>('manual');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedSession, setExtractedSession] = useState<ExtractedSession | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [showRawCookies, setShowRawCookies] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-detect if we have required cookies
  useEffect(() => {
    if (extractedSession?.cookies) {
      validateCookies();
    }
  }, [extractedSession]);

  const validateCookies = async () => {
    if (!extractedSession) return;

    setValidationStatus('validating');

    // Check for required cookies
    const hasLiAt = extractedSession.cookies.some(c => c.name === 'li_at');
    const hasJSessionId = extractedSession.cookies.some(c => c.name === 'JSESSIONID');

    if (!hasLiAt) {
      setValidationStatus('invalid');
      toast({
        title: 'Missing Required Cookie',
        description: 'The li_at cookie is required for LinkedIn authentication',
        variant: 'destructive',
      });
      return;
    }

    // Check if li_at cookie is not expired
    const liAtCookie = extractedSession.cookies.find(c => c.name === 'li_at');
    if (liAtCookie?.expires) {
      const expiryDate = new Date(liAtCookie.expires * 1000);
      if (expiryDate < new Date()) {
        setValidationStatus('invalid');
        toast({
          title: 'Cookie Expired',
          description: 'Your LinkedIn session has expired. Please log in again.',
          variant: 'destructive',
        });
        return;
      }
    }

    setValidationStatus('valid');
  };

  const extractCookiesFromBrowser = async () => {
    setIsExtracting(true);

    try {
      // Attempt to extract cookies using browser extension API (if available)
      if (typeof chrome !== 'undefined' && chrome.cookies) {
        const cookies = await chrome.cookies.getAll({ domain: '.linkedin.com' });

        const session: ExtractedSession = {
          cookies: cookies.map(c => ({
            name: c.name,
            value: c.value,
            domain: c.domain || '.linkedin.com',
            path: c.path || '/',
            expires: c.expirationDate,
            httpOnly: c.httpOnly || false,
            secure: c.secure || true
          })),
          userAgent: navigator.userAgent,
          extractedAt: new Date().toISOString(),
          isValid: true
        };

        setExtractedSession(session);
        toast({
          title: 'Cookies Extracted',
          description: 'Successfully extracted LinkedIn cookies from browser',
        });
      } else {
        // Fallback: Guide user to manual extraction
        toast({
          title: 'Manual Extraction Required',
          description: 'Please use the manual method to extract cookies',
          variant: 'default',
        });
        setExtractionMethod('manual');
      }
    } catch (error) {
      console.error('Cookie extraction failed:', error);
      toast({
        title: 'Extraction Failed',
        description: 'Could not automatically extract cookies. Please use manual method.',
        variant: 'destructive',
      });
      setExtractionMethod('manual');
    } finally {
      setIsExtracting(false);
    }
  };

  const parseManualCookies = () => {
    try {
      let cookies: LinkedInCookie[] = [];

      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(manualInput);

        // Handle different JSON formats
        if (Array.isArray(parsed)) {
          cookies = parsed;
        } else if (parsed.cookies && Array.isArray(parsed.cookies)) {
          cookies = parsed.cookies;
        } else if (parsed.li_at) {
          // Simple key-value format
          cookies = [
            {
              name: 'li_at',
              value: parsed.li_at,
              domain: '.linkedin.com',
              path: '/',
              httpOnly: true,
              secure: true
            }
          ];

          if (parsed.JSESSIONID) {
            cookies.push({
              name: 'JSESSIONID',
              value: parsed.JSESSIONID,
              domain: '.www.linkedin.com',
              path: '/',
              httpOnly: false,
              secure: true
            });
          }
        }
      } catch {
        // Try to parse as cookie string (key=value; key=value)
        const cookiePairs = manualInput.split(';').map(s => s.trim());

        cookiePairs.forEach(pair => {
          const [name, ...valueParts] = pair.split('=');
          if (name && valueParts.length > 0) {
            const value = valueParts.join('='); // Handle values with = in them

            if (name.trim() === 'li_at' || name.trim() === 'JSESSIONID') {
              cookies.push({
                name: name.trim(),
                value: value.trim(),
                domain: name.trim() === 'JSESSIONID' ? '.www.linkedin.com' : '.linkedin.com',
                path: '/',
                httpOnly: name.trim() === 'li_at',
                secure: true
              });
            }
          }
        });
      }

      if (cookies.length === 0) {
        throw new Error('No valid cookies found in input');
      }

      const session: ExtractedSession = {
        cookies,
        userAgent: navigator.userAgent,
        extractedAt: new Date().toISOString(),
        isValid: true
      };

      setExtractedSession(session);
      toast({
        title: 'Cookies Parsed',
        description: `Successfully parsed ${cookies.length} cookie(s)`,
      });
    } catch (error) {
      toast({
        title: 'Parse Error',
        description: 'Could not parse cookie data. Please check the format.',
        variant: 'destructive',
      });
    }
  };

  const saveCookiesToDatabase = async () => {
    if (!extractedSession || validationStatus !== 'valid') {
      toast({
        title: 'Invalid Session',
        description: 'Please ensure cookies are valid before saving',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/linkedin/save-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cookies: JSON.stringify(extractedSession.cookies),
          userAgent: extractedSession.userAgent
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save session');
      }

      toast({
        title: 'Session Saved',
        description: 'LinkedIn cookies have been securely stored',
      });

      // Clear sensitive data from UI
      setManualInput('');
      setExtractedSession(null);
      setValidationStatus('idle');

      // Trigger callback if provided
      if (onSessionSaved) {
        onSessionSaved();
      }
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Could not save cookies to database',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const copyExampleFormat = () => {
    const example = JSON.stringify({
      li_at: 'YOUR_LI_AT_COOKIE_VALUE',
      JSESSIONID: 'YOUR_JSESSIONID_VALUE'
    }, null, 2);

    navigator.clipboard.writeText(example);
    toast({
      title: 'Copied',
      description: 'Example format copied to clipboard',
    });
  };

  return (
    <div className="space-y-6">
      <Tabs value={extractionMethod} onValueChange={(v) => setExtractionMethod(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="auto">Auto Extract</TabsTrigger>
          <TabsTrigger value="extension">Browser Extension</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Cookie Entry</CardTitle>
              <CardDescription>
                Paste your LinkedIn cookies in any of the supported formats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cookie Data</Label>
                <Textarea
                  placeholder="Paste cookies here (JSON, cookie string, or key-value format)..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={parseManualCookies}
                  disabled={!manualInput}
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  Parse Cookies
                </Button>
                <Button
                  variant="outline"
                  onClick={copyExampleFormat}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Example
                </Button>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Supported Formats</AlertTitle>
                <AlertDescription className="space-y-2 mt-2">
                  <div className="text-xs space-y-1">
                    <p>• <strong>JSON Object:</strong> {"{ \"li_at\": \"value\", \"JSESSIONID\": \"value\" }"}</p>
                    <p>• <strong>Cookie String:</strong> li_at=value; JSESSIONID=value</p>
                    <p>• <strong>Full JSON:</strong> [{"{ name: \"li_at\", value: \"...\", ... }"}]</p>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Automatic Extraction</CardTitle>
              <CardDescription>
                Extract cookies directly from your browser
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Prerequisites</AlertTitle>
                <AlertDescription>
                  1. You must be logged into LinkedIn in this browser<br />
                  2. Browser extensions may be required for some browsers<br />
                  3. Pop-ups must be allowed for this site
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button
                  onClick={extractCookiesFromBrowser}
                  disabled={isExtracting}
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Chrome className="h-4 w-4 mr-2" />
                      Extract from Browser
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://www.linkedin.com', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open LinkedIn
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="extension" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Browser Extension Method</CardTitle>
              <CardDescription>
                Use our browser extension for easy cookie extraction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>Coming Soon</AlertTitle>
                <AlertDescription>
                  We're developing a browser extension that will make cookie extraction even easier.
                  For now, please use the manual method.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Manual Extraction Steps:</h4>
                <ol className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span className="font-semibold">1.</span>
                    <span>Open LinkedIn and ensure you're logged in</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold">2.</span>
                    <span>Press F12 to open Developer Tools</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold">3.</span>
                    <span>Go to Application → Cookies → linkedin.com</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold">4.</span>
                    <span>Find the "li_at" cookie and copy its value</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold">5.</span>
                    <span>Find "JSESSIONID" cookie and copy its value</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold">6.</span>
                    <span>Switch to "Manual Entry" tab and paste the values</span>
                  </li>
                </ol>
              </div>

              <Button
                variant="outline"
                onClick={() => setExtractionMethod('manual')}
              >
                <Code2 className="h-4 w-4 mr-2" />
                Go to Manual Entry
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Extracted Session Display */}
      {extractedSession && (
        <Card className={validationStatus === 'valid' ? 'border-green-500' : validationStatus === 'invalid' ? 'border-red-500' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Extracted Session
                  {validationStatus === 'valid' && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {validationStatus === 'invalid' && (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </CardTitle>
                <CardDescription>
                  {validationStatus === 'valid'
                    ? 'Session is valid and ready to save'
                    : validationStatus === 'invalid'
                    ? 'Session validation failed'
                    : 'Validating session...'}
                </CardDescription>
              </div>
              <Badge variant={validationStatus === 'valid' ? 'default' : 'destructive'}>
                {extractedSession.cookies.length} cookie(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {extractedSession.cookies.map((cookie, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <Cookie className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">{cookie.name}</span>
                    {cookie.name === 'li_at' && (
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {cookie.secure && (
                      <Shield className="h-3 w-3 text-green-500" />
                    )}
                    {cookie.httpOnly && (
                      <Key className="h-3 w-3 text-blue-500" />
                    )}
                    {!showRawCookies && (
                      <span className="text-xs text-muted-foreground">
                        {cookie.value.substring(0, 8)}...
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={saveCookiesToDatabase}
                disabled={validationStatus !== 'valid' || isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save to Database
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setExtractedSession(null);
                  setValidationStatus('idle');
                  setManualInput('');
                }}
              >
                Clear
              </Button>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Security Notice</AlertTitle>
              <AlertDescription>
                Your cookies will be encrypted before storage. Never share these values with anyone.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}