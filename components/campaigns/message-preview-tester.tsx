'use client';

import { useState, useEffect } from 'react';
import { Eye, Send, TestTube, User, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface MessagePreviewTesterProps {
  campaignId: string;
  template: string;
  targets?: any[];
}

interface PreviewTarget {
  id: string;
  name: string;
  headline: string;
  company_name?: string;
  position?: string;
  location?: string;
  profile_data?: any;
}

interface TestResult {
  targetId: string;
  message: string;
  personalizationScore: number;
  warnings: string[];
  characterCount: number;
  estimatedReadTime: string;
  linkedinLimit: boolean;
}

export default function MessagePreviewTester({ campaignId, template, targets = [] }: MessagePreviewTesterProps) {
  const [selectedTargets, setSelectedTargets] = useState<PreviewTarget[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'test'>('preview');
  const supabase = createClient();

  useEffect(() => {
    if (targets.length > 0) {
      // Select first 3 targets for preview
      setSelectedTargets(targets.slice(0, 3));
    } else {
      loadSampleTargets();
    }
  }, [targets]);

  const loadSampleTargets = async () => {
    const { data } = await supabase
      .from('campaign_targets')
      .select('*')
      .eq('campaign_id', campaignId)
      .limit(5);

    if (data) {
      setSelectedTargets(data.slice(0, 3));
    }
  };

  const generatePreview = async (target: PreviewTarget) => {
    // Call AI to generate personalized message
    const response = await fetch('/api/ai/generate-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template,
        targetProfile: target,
      }),
    });

    const result = await response.json();
    return result.message || template;
  };

  const analyzeMessage = (message: string, target: PreviewTarget): Partial<TestResult> => {
    const warnings: string[] = [];
    const charCount = message.length;

    // LinkedIn message limit is 300 characters for connection requests, 8000 for InMail
    if (charCount > 8000) {
      warnings.push('Message exceeds LinkedIn InMail limit (8000 chars)');
    } else if (charCount > 300) {
      warnings.push('Message too long for connection request (max 300 chars)');
    }

    // Check for personalization tokens
    const hasName = message.includes(target.name.split(' ')[0]);
    const hasCompany = target.company_name && message.includes(target.company_name);
    const hasRole = target.position && message.includes(target.position);

    let personalizationScore = 0;
    if (hasName) personalizationScore += 40;
    if (hasCompany) personalizationScore += 30;
    if (hasRole) personalizationScore += 30;

    // Check for spam triggers
    const spamWords = ['free', 'guarantee', 'urgent', 'act now', 'limited time', 'click here'];
    const lowerMessage = message.toLowerCase();
    spamWords.forEach(word => {
      if (lowerMessage.includes(word)) {
        warnings.push(`Contains potential spam trigger: "${word}"`);
      }
    });

    // Check for excessive capitalization
    const capsRatio = (message.match(/[A-Z]/g) || []).length / message.length;
    if (capsRatio > 0.3) {
      warnings.push('Excessive capitalization detected');
    }

    // Check for multiple exclamation marks
    if ((message.match(/!/g) || []).length > 2) {
      warnings.push('Too many exclamation marks');
    }

    // Estimate read time (average 200 words per minute)
    const wordCount = message.split(' ').length;
    const readTime = Math.ceil(wordCount / 200 * 60);

    return {
      characterCount: charCount,
      personalizationScore,
      warnings,
      estimatedReadTime: `${readTime}s`,
      linkedinLimit: charCount <= 8000,
    };
  };

  const runTests = async () => {
    setTesting(true);
    const results: TestResult[] = [];

    for (const target of selectedTargets) {
      try {
        const message = await generatePreview(target);
        const analysis = analyzeMessage(message, target);

        results.push({
          targetId: target.id,
          message,
          ...analysis,
        } as TestResult);
      } catch (error) {
        console.error('Test failed for target:', target.id, error);
      }
    }

    setTestResults(results);
    setTesting(false);
  };

  const sendTestMessage = async (targetId: string) => {
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const result = testResults.find(r => r.targetId === targetId);
      if (!result) throw new Error('Test result not found');

      // Send test message to user's email
      const response = await fetch('/api/notifications/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: 'LinkedIn Message Test',
          message: result.message,
          targetName: selectedTargets.find(t => t.id === targetId)?.name,
        }),
      });

      if (!response.ok) throw new Error('Failed to send test');

      toast.success('Test message sent to your email');
    } catch (error) {
      toast.error('Failed to send test message');
    } finally {
      setSending(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Message Preview & Testing
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'preview' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'test' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Test
          </button>
        </div>
      </div>

      {activeTab === 'preview' ? (
        <div className="space-y-4">
          {/* Template Display */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <label className="block text-sm font-medium mb-2">Message Template</label>
            <div className="font-mono text-sm whitespace-pre-wrap">{template}</div>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="text-gray-500">Variables:</span>
              <span className="text-blue-600">{'{first_name}'}</span>
              <span className="text-blue-600">{'{company}'}</span>
              <span className="text-blue-600">{'{role}'}</span>
              <span className="text-blue-600">{'{mutual_connection}'}</span>
            </div>
          </div>

          {/* Target Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Preview Targets</label>
              <button
                onClick={loadSampleTargets}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </button>
            </div>
            <div className="space-y-2">
              {selectedTargets.map((target) => (
                <div
                  key={target.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                >
                  <User className="h-10 w-10 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium">{target.name}</p>
                    <p className="text-sm text-gray-600">
                      {target.position} {target.company_name && `at ${target.company_name}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Previews Button */}
          <button
            onClick={runTests}
            disabled={testing || selectedTargets.length === 0}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {testing ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Generating Previews...</>
            ) : (
              <><Eye className="h-4 w-4" /> Generate Personalized Previews</>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {testResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TestTube className="h-12 w-12 mx-auto mb-3" />
              <p>Run tests to see personalized messages and analysis</p>
              <button
                onClick={runTests}
                disabled={testing || selectedTargets.length === 0}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {testing ? 'Running Tests...' : 'Run Tests'}
              </button>
            </div>
          ) : (
            testResults.map((result, idx) => {
              const target = selectedTargets.find(t => t.id === result.targetId);
              if (!target) return null;

              return (
                <div key={result.targetId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <User className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="font-medium">{target.name}</p>
                        <p className="text-sm text-gray-600">
                          {target.position} {target.company_name && `at ${target.company_name}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => sendTestMessage(result.targetId)}
                      disabled={sending}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      <Send className="h-3 w-3" />
                      Send Test
                    </button>
                  </div>

                  {/* Message Preview */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-sm whitespace-pre-wrap">{result.message}</p>
                  </div>

                  {/* Analysis Results */}
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Length</p>
                      <p className={`font-medium ${
                        result.linkedinLimit ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {result.characterCount} chars
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Personalization</p>
                      <p className={`font-medium ${getScoreColor(result.personalizationScore)}`}>
                        {result.personalizationScore}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Read Time</p>
                      <p className="font-medium">{result.estimatedReadTime}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-medium">
                        {result.warnings.length === 0 ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" /> Good
                          </span>
                        ) : (
                          <span className="text-yellow-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> {result.warnings.length} Issues
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs font-medium text-yellow-800 mb-1">Warnings:</p>
                      <ul className="text-xs text-yellow-700 space-y-0.5">
                        {result.warnings.map((warning, i) => (
                          <li key={i}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}