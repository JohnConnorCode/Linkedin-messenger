'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { TemplatePreview } from '@/components/templates/template-preview';
import { extractVariables, renderTemplate } from '@/lib/templating';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewTemplatePage() {
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const variables = extractVariables(body);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !body.trim()) {
      toast({
        title: 'Validation error',
        description: 'Template name and body are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from('message_templates').insert({
        name,
        body,
        variables,
        is_active: isActive,
      } as any);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Template created successfully',
      });

      router.push('/templates');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create template',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/templates">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Template</h1>
          <p className="text-muted-foreground mt-1">
            Create a reusable message template with variables
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
              <CardDescription>
                Define your message template with variables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <Label htmlFor="name">Template Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Recruitment Outreach"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={saving}
                  />
                </div>

                <div>
                  <Label htmlFor="body">Message Body</Label>
                  <Textarea
                    id="body"
                    placeholder="Hi {{first_name}},

I noticed you work at {{company}} as a {{headline}}.

{{#company}}
I'd love to connect and discuss opportunities at {{company}}.
{{/company}}

Best regards"
                    className="min-h-[200px] font-mono text-sm"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    disabled={saving}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Use {'{{variable}}'} for variables and {'{{#condition}}...{{/condition}}'} for conditionals
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    disabled={saving}
                  />
                  <Label htmlFor="active">Active template</Label>
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? 'Creating...' : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Template
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Variables</CardTitle>
              <CardDescription>
                Common variables you can use in your templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <code className="bg-muted px-2 py-1 rounded">{'{{first_name}}'}</code>
                <code className="bg-muted px-2 py-1 rounded">{'{{last_name}}'}</code>
                <code className="bg-muted px-2 py-1 rounded">{'{{full_name}}'}</code>
                <code className="bg-muted px-2 py-1 rounded">{'{{company}}'}</code>
                <code className="bg-muted px-2 py-1 rounded">{'{{headline}}'}</code>
                <code className="bg-muted px-2 py-1 rounded">{'{{location}}'}</code>
                <code className="bg-muted px-2 py-1 rounded">{'{{today}}'}</code>
                <code className="bg-muted px-2 py-1 rounded">{'{{sender_first_name}}'}</code>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <TemplatePreview template={body} />
        </div>
      </div>
    </div>
  );
}