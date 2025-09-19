import { createServerComponentClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus, Edit, Trash2, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default async function TemplatesPage() {
  const supabase = await createServerComponentClient();

  const { data: templates } = await supabase
    .from('message_templates')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Message Templates</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage reusable message templates with variables
          </p>
        </div>
        <Link href="/templates/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates?.map((template: any) => (
          <Card key={template.id} className="relative">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {template.is_active ? (
                      <Badge variant="secondary" className="text-xs">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {template.body}
                </p>

                {template.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((variable: string) => (
                      <Badge key={variable} variant="outline" className="text-xs">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Link href={`/templates/${template.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Copy className="h-3 w-3 mr-1" />
                    Duplicate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!templates || templates.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No templates yet</p>
              <Link href="/templates/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create your first template
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}