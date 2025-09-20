'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, MoreVertical, User, Brain } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Connection {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  linkedin_url: string | null;
  headline: string | null;
  company: string | null;
  location: string | null;
  tags: string[] | null;
  last_messaged_at: string | null;
}

export function ConnectionsTable({ searchQuery }: { searchQuery: string }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    fetchConnections();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const fetchConnections = async () => {
    setLoading(true);
    let query = supabase.from('connections').select('*');

    if (searchQuery) {
      query = query.or(
        `full_name.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%,headline.ilike.%${searchQuery}%`
      );
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (!error && data) {
      setConnections(data);
    }
    setLoading(false);
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleAll = () => {
    if (selectedIds.size === connections.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(connections.map((c) => c.id)));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading connections...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr>
                <th className="p-4 text-left">
                  <Checkbox
                    checked={selectedIds.size === connections.length && connections.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="p-4 text-left text-sm font-medium">Name</th>
                <th className="p-4 text-left text-sm font-medium">Company</th>
                <th className="p-4 text-left text-sm font-medium">Headline</th>
                <th className="p-4 text-left text-sm font-medium">Tags</th>
                <th className="p-4 text-left text-sm font-medium">Last Messaged</th>
                <th className="p-4 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {connections.map((connection) => (
                <tr key={connection.id} className="border-b hover:bg-muted/50">
                  <td className="p-4">
                    <Checkbox
                      checked={selectedIds.has(connection.id)}
                      onCheckedChange={() => toggleSelection(connection.id)}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-medium">{connection.full_name || 'Unknown'}</p>
                        {connection.location && (
                          <p className="text-xs text-muted-foreground">{connection.location}</p>
                        )}
                      </div>
                      {connection.linkedin_url && (
                        <a
                          href={connection.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm">{connection.company || '-'}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm line-clamp-2">{connection.headline || '-'}</p>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1 flex-wrap">
                      {connection.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      )) || '-'}
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="text-sm">
                      {connection.last_messaged_at
                        ? new Date(connection.last_messaged_at).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </td>
                  <td className="p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => window.location.href = `/connections/${connection.id}/profile`}
                        >
                          <User className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => window.location.href = `/connections/${connection.id}/profile`}
                        >
                          <Brain className="h-4 w-4 mr-2" />
                          AI Analysis
                        </DropdownMenuItem>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>Add Tags</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {connections.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No connections found. Import your connections to get started.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}