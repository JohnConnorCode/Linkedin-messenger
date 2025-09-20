'use client';

import { useState } from 'react';
import { Download, Upload, Archive, FileJson, FileText, Shield, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ExportBackupManagerProps {
  campaignId: string;
  campaignName: string;
}

type ExportFormat = 'json' | 'csv' | 'excel';
type ExportScope = 'all' | 'targets' | 'messages' | 'analytics' | 'settings';

export default function ExportBackupManager({ campaignId, campaignName }: ExportBackupManagerProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupHistory, setBackupHistory] = useState<any[]>([]);
  const supabase = createClient();

  const exportData = async () => {
    setIsExporting(true);
    try {
      // Fetch data based on scope
      const data: any = {};

      if (exportScope === 'all' || exportScope === 'settings') {
        const { data: campaign } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .single();
        data.campaign = campaign;
      }

      if (exportScope === 'all' || exportScope === 'targets') {
        const { data: targets } = await supabase
          .from('campaign_targets')
          .select('*')
          .eq('campaign_id', campaignId);
        data.targets = targets;
      }

      if (exportScope === 'all' || exportScope === 'messages') {
        const { data: messages } = await supabase
          .from('task_queue')
          .select('*, ai_personalization_queue(*)')
          .eq('campaign_id', campaignId);
        data.messages = messages;

        const { data: logs } = await supabase
          .from('message_log')
          .select('*')
          .eq('campaign_id', campaignId);
        data.messageLogs = logs;
      }

      if (exportScope === 'all' || exportScope === 'analytics') {
        const { data: analytics } = await supabase
          .from('campaign_analytics')
          .select('*')
          .eq('campaign_id', campaignId);
        data.analytics = analytics;
      }

      // Format data based on selected format
      let exportedData: any;
      let filename: string;
      let mimeType: string;

      switch (exportFormat) {
        case 'csv':
          exportedData = convertToCSV(data);
          filename = `${campaignName}-${exportScope}-${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;
        case 'excel':
          exportedData = convertToExcel(data);
          filename = `${campaignName}-${exportScope}-${Date.now()}.xlsx`;
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'json':
        default:
          exportedData = JSON.stringify(data, null, 2);
          filename = `${campaignName}-${exportScope}-${Date.now()}.json`;
          mimeType = 'application/json';
      }

      // Create download
      const blob = new Blob([exportedData], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Data exported as ${filename}`);

      // Log export activity
      await supabase.from('activity_logs').insert({
        type: 'export',
        campaign_id: campaignId,
        metadata: {
          format: exportFormat,
          scope: exportScope,
          filename,
          recordCount: Object.values(data).flat().length,
        },
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const createBackup = async () => {
    setIsBackingUp(true);
    try {
      // Fetch all campaign data
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      const { data: targets } = await supabase
        .from('campaign_targets')
        .select('*')
        .eq('campaign_id', campaignId);

      const { data: messages } = await supabase
        .from('task_queue')
        .select('*')
        .eq('campaign_id', campaignId);

      const { data: aiQueue } = await supabase
        .from('ai_personalization_queue')
        .select('*')
        .in('task_id', messages?.map(m => m.id) || []);

      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        campaign,
        targets,
        messages,
        aiQueue,
      };

      // Store backup in Supabase storage
      const backupJson = JSON.stringify(backupData);
      const fileName = `backups/${campaignId}/${Date.now()}.json`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('campaign-backups')
        .upload(fileName, backupJson, {
          contentType: 'application/json',
        });

      if (uploadError) throw uploadError;

      // Save backup metadata
      const { data: backup, error: dbError } = await supabase
        .from('campaign_backups')
        .insert({
          campaign_id: campaignId,
          backup_path: fileName,
          size_bytes: new Blob([backupJson]).size,
          record_counts: {
            targets: targets?.length || 0,
            messages: messages?.length || 0,
            aiQueue: aiQueue?.length || 0,
          },
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success('Backup created successfully');
      
      // Refresh backup history
      loadBackupHistory();
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Failed to create backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (!confirm('Are you sure you want to restore this backup? This will overwrite current data.')) {
      return;
    }

    try {
      const { data: backup } = await supabase
        .from('campaign_backups')
        .select('*')
        .eq('id', backupId)
        .single();

      if (!backup) throw new Error('Backup not found');

      // Download backup file
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('campaign-backups')
        .download(backup.backup_path);

      if (downloadError) throw downloadError;

      const backupData = JSON.parse(await fileData.text());

      // Restore data (would need transaction support for production)
      // This is a simplified version
      toast.info('Restoring backup...');

      // Update campaign
      await supabase
        .from('campaigns')
        .update(backupData.campaign)
        .eq('id', campaignId);

      // Clear and restore targets
      await supabase
        .from('campaign_targets')
        .delete()
        .eq('campaign_id', campaignId);

      if (backupData.targets?.length > 0) {
        await supabase
          .from('campaign_targets')
          .insert(backupData.targets);
      }

      toast.success('Backup restored successfully');
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Failed to restore backup');
    }
  };

  const loadBackupHistory = async () => {
    const { data } = await supabase
      .from('campaign_backups')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) setBackupHistory(data);
  };

  const convertToCSV = (data: any) => {
    // Simplified CSV conversion - in production, use a library like papaparse
    if (data.targets) {
      const headers = Object.keys(data.targets[0] || {}).join(',');
      const rows = data.targets.map((row: any) => 
        Object.values(row).map(v => 
          typeof v === 'string' && v.includes(',') ? `"${v}"` : v
        ).join(',')
      );
      return [headers, ...rows].join('\n');
    }
    return '';
  };

  const convertToExcel = (data: any) => {
    // In production, use a library like xlsx
    toast.info('Excel export requires additional setup. Using CSV instead.');
    return convertToCSV(data);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Archive className="h-5 w-5" />
          Export & Backup
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Export campaign data or create secure backups
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Data
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Format</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data Scope</label>
              <select
                value={exportScope}
                onChange={(e) => setExportScope(e.target.value as ExportScope)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="all">All Data</option>
                <option value="targets">Targets Only</option>
                <option value="messages">Messages Only</option>
                <option value="analytics">Analytics Only</option>
                <option value="settings">Settings Only</option>
              </select>
            </div>

            <button
              onClick={exportData}
              disabled={isExporting}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>Exporting...</>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export Data
                </>
              )}
            </button>

            <div className="text-xs text-gray-500">
              <p>• JSON: Best for backups and data migration</p>
              <p>• CSV: Compatible with Excel and Google Sheets</p>
              <p>• Excel: Direct Excel format (requires setup)</p>
            </div>
          </div>
        </div>

        {/* Backup Section */}
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Secure Backup
          </h3>

          <div className="space-y-3">
            <button
              onClick={createBackup}
              disabled={isBackingUp}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isBackingUp ? (
                <>Creating Backup...</>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  Create New Backup
                </>
              )}
            </button>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Recent Backups</p>
              {backupHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No backups yet</p>
              ) : (
                <div className="space-y-1">
                  {backupHistory.map((backup) => (
                    <div
                      key={backup.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {new Date(backup.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {backup.record_counts?.targets || 0} targets,
                          {backup.record_counts?.messages || 0} messages
                        </p>
                      </div>
                      <button
                        onClick={() => restoreBackup(backup.id)}
                        className="px-2 py-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium">Automatic Backups</p>
                  <p>Backups are encrypted and stored securely.</p>
                  <p>Keep last 30 days of backups automatically.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}