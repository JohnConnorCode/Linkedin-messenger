'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Brain,
  RefreshCw,
  User,
  Briefcase,
  GraduationCap,
  Award,
  MapPin,
  Link as LinkIcon,
  Calendar,
  Sparkles,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

export default function ProfilePage({ params }: { params: { id: string } }) {
  const [connection, setConnection] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    fetchProfileData();
  }, [params.id]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      // Get connection details
      const { data: conn } = await supabase
        .from('connections')
        .select('*')
        .eq('id', params.id)
        .single();

      setConnection(conn);

      // Get profile raw data
      const { data: profile } = await supabase
        .from('profile_raw')
        .select('*')
        .eq('connection_id', params.id)
        .order('scraped_at', { ascending: false })
        .limit(1)
        .single();

      setProfileData(profile);

      // Get AI summary
      const { data: summary } = await supabase
        .from('profile_ai_summaries')
        .select('*')
        .eq('connection_id', params.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      setAiSummary(summary);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeProfile = async () => {
    if (!connection?.linkedin_url) {
      toast({
        title: 'Error',
        description: 'No LinkedIn URL available for this connection',
        variant: 'destructive'
      });
      return;
    }

    setScraping(true);
    try {
      const response = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scrape-profile',
          profileUrl: connection.linkedin_url,
          connectionId: params.id
        })
      });

      if (!response.ok) throw new Error('Scraping failed');

      const result = await response.json();

      toast({
        title: 'Profile Scraped',
        description: 'LinkedIn profile data has been updated successfully'
      });

      // Refresh data
      await fetchProfileData();
    } catch (error) {
      toast({
        title: 'Scraping Failed',
        description: 'Could not scrape LinkedIn profile. Make sure you\'re logged in.',
        variant: 'destructive'
      });
    } finally {
      setScraping(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!profileData) {
      toast({
        title: 'Error',
        description: 'Please scrape the profile first',
        variant: 'destructive'
      });
      return;
    }

    setAiProcessing(true);
    try {
      // Find a campaign for this connection
      const { data: target } = await supabase
        .from('campaign_targets')
        .select('campaign_id')
        .eq('connection_id', params.id)
        .limit(1)
        .single();

      if (!target) {
        toast({
          title: 'No Campaign',
          description: 'This connection is not part of any campaign',
          variant: 'destructive'
        });
        return;
      }

      const response = await fetch('/api/ai-processor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process-single',
          connectionId: params.id,
          campaignId: target.campaign_id
        })
      });

      if (!response.ok) throw new Error('AI processing failed');

      toast({
        title: 'AI Analysis Complete',
        description: 'GPT-5 Nano has generated personalization insights'
      });

      // Refresh data
      await fetchProfileData();
    } catch (error) {
      toast({
        title: 'AI Processing Failed',
        description: 'Could not generate AI insights',
        variant: 'destructive'
      });
    } finally {
      setAiProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Loading profile...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const profileAge = profileData?.scraped_at
    ? Math.floor((Date.now() - new Date(profileData.scraped_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <User className="h-8 w-8" />
            {connection?.full_name || 'Unknown'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {connection?.headline || 'No headline'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleScrapeProfile}
            disabled={scraping}
            variant="outline"
          >
            {scraping ? (
              <>Scraping...</>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Scrape Profile
              </>
            )}
          </Button>
          <Button
            onClick={handleGenerateAI}
            disabled={aiProcessing || !profileData}
          >
            {aiProcessing ? (
              <>Processing...</>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generate AI Insights
              </>
            )}
          </Button>
          {connection?.linkedin_url && (
            <Button variant="ghost" asChild>
              <a href={connection.linkedin_url} target="_blank" rel="noopener">
                <LinkIcon className="h-4 w-4 mr-2" />
                View on LinkedIn
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Profile Data</CardTitle>
          </CardHeader>
          <CardContent>
            {profileData ? (
              <div className="space-y-2">
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Scraped
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Last updated {profileAge} days ago
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Badge variant="secondary">Not Scraped</Badge>
                <p className="text-sm text-muted-foreground">
                  Click "Scrape Profile" to fetch data
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">AI Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            {aiSummary ? (
              <div className="space-y-2">
                <Badge className="bg-purple-100 text-purple-700">
                  <Brain className="h-3 w-3 mr-1" />
                  Analyzed
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Confidence: {Math.round(aiSummary.confidence_score * 100)}%
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Badge variant="outline">Not Analyzed</Badge>
                <p className="text-sm text-muted-foreground">
                  Generate AI insights for personalization
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Connection Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {connection?.company && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-3 w-3" />
                  {connection.company}
                </div>
              )}
              {connection?.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3" />
                  {connection.location}
                </div>
              )}
              {connection?.tags?.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {connection.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Details */}
      {profileData && (
        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile Data</TabsTrigger>
            <TabsTrigger value="ai" disabled={!aiSummary}>
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Professional Profile</CardTitle>
                <CardDescription>
                  Scraped from LinkedIn on {new Date(profileData.scraped_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* About */}
                {profileData.raw_data?.about && (
                  <div>
                    <h3 className="font-medium mb-2">About</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {profileData.raw_data.about}
                    </p>
                  </div>
                )}

                {/* Experience */}
                {profileData.raw_data?.experience?.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Experience
                    </h3>
                    <div className="space-y-3">
                      {profileData.raw_data.experience.map((exp: any, idx: number) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="font-medium">{exp.title}</div>
                          <div className="text-sm text-muted-foreground">{exp.company}</div>
                          {exp.duration && (
                            <div className="text-xs text-muted-foreground mt-1">{exp.duration}</div>
                          )}
                          {exp.description && (
                            <p className="text-sm mt-2">{exp.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {profileData.raw_data?.education?.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Education
                    </h3>
                    <div className="space-y-3">
                      {profileData.raw_data.education.map((edu: any, idx: number) => (
                        <div key={idx} className="p-3 border rounded-lg">
                          <div className="font-medium">{edu.school}</div>
                          {edu.degree && (
                            <div className="text-sm text-muted-foreground">
                              {edu.degree} {edu.field && `- ${edu.field}`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {profileData.raw_data?.skills?.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profileData.raw_data.skills.map((skill: string) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            {aiSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI-Generated Insights
                  </CardTitle>
                  <CardDescription>
                    Generated by GPT-5 Nano with {Math.round(aiSummary.confidence_score * 100)}% confidence
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Personalized Lines */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium mb-1">Opening Line</h4>
                      <p className="text-sm p-3 bg-muted rounded-lg">
                        {aiSummary.first_line}
                      </p>
                    </div>
                    {aiSummary.midline && (
                      <div>
                        <h4 className="font-medium mb-1">Context Line</h4>
                        <p className="text-sm p-3 bg-muted rounded-lg">
                          {aiSummary.midline}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Persona */}
                  {aiSummary.persona && (
                    <div>
                      <h4 className="font-medium mb-2">Persona Analysis</h4>
                      <div className="space-y-2">
                        {Object.entries(aiSummary.persona).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-muted-foreground capitalize">
                              {key.replace(/_/g, ' ')}:
                            </span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interests & Expertise */}
                  <div className="grid grid-cols-2 gap-4">
                    {aiSummary.interests?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Interests</h4>
                        <div className="flex flex-wrap gap-1">
                          {aiSummary.interests.map((interest: string) => (
                            <Badge key={interest} variant="outline" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {aiSummary.expertise?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Expertise</h4>
                        <div className="flex flex-wrap gap-1">
                          {aiSummary.expertise.map((exp: string) => (
                            <Badge key={exp} variant="outline" className="text-xs">
                              {exp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="raw">
            <Card>
              <CardHeader>
                <CardTitle>Raw JSON Data</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
                  {JSON.stringify(profileData.raw_data, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Warning if data is stale */}
      {profileAge && profileAge > 30 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Profile data is {profileAge} days old. Consider refreshing it for accurate AI personalization.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}