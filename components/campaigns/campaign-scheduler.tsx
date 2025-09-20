'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Play, Pause, AlertCircle, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface ScheduleSettings {
  enabled: boolean;
  startDate: string;
  endDate?: string;
  workingHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };
  workingDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  dailyLimit: number;
  hourlyLimit: number;
  pauseBetweenMessages: {
    min: number;
    max: number;
  };
}

interface CampaignSchedulerProps {
  campaignId: string;
  onScheduleUpdate?: (settings: ScheduleSettings) => void;
}

export default function CampaignScheduler({ campaignId, onScheduleUpdate }: CampaignSchedulerProps) {
  const [settings, setSettings] = useState<ScheduleSettings>({
    enabled: false,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    workingHours: {
      enabled: true,
      startTime: '09:00',
      endTime: '17:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    workingDays: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false,
    },
    dailyLimit: 50,
    hourlyLimit: 10,
    pauseBetweenMessages: {
      min: 60,
      max: 180,
    },
  });

  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadScheduleSettings();
  }, [campaignId]);

  const loadScheduleSettings = async () => {
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('schedule_settings')
      .eq('id', campaignId)
      .single();

    if (campaign?.schedule_settings) {
      setSettings(campaign.schedule_settings);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          schedule_settings: settings,
          status: settings.enabled ? 'scheduled' : 'draft',
        })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success('Schedule settings saved');
      onScheduleUpdate?.(settings);
    } catch (error) {
      toast.error('Failed to save schedule settings');
    } finally {
      setSaving(false);
    }
  };

  const isWithinSchedule = () => {
    if (!settings.enabled) return false;

    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'lowercase' }) as keyof typeof settings.workingDays;

    if (!settings.workingDays[today]) return false;

    if (settings.workingHours.enabled) {
      const currentTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      if (currentTime < settings.workingHours.startTime || currentTime > settings.workingHours.endTime) {
        return false;
      }
    }

    return true;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Campaign Schedule
        </h2>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm ${
            isWithinSchedule() 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {isWithinSchedule() ? (
              <><CheckCircle className="h-3 w-3 inline mr-1" /> Active</>
            ) : (
              <><Pause className="h-3 w-3 inline mr-1" /> Outside Schedule</>
            )}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Enable Schedule */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <label className="font-medium">Enable Scheduling</label>
            <p className="text-sm text-gray-600">Run campaign only during specified times</p>
          </div>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
            className="h-5 w-5 text-blue-600 rounded"
          />
        </div>

        {settings.enabled && (
          <>
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={settings.startDate}
                  onChange={(e) => setSettings({ ...settings, startDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date (Optional)</label>
                <input
                  type="date"
                  value={settings.endDate || ''}
                  onChange={(e) => setSettings({ ...settings, endDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Working Hours */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <label className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Working Hours
                </label>
                <input
                  type="checkbox"
                  checked={settings.workingHours.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    workingHours: { ...settings.workingHours, enabled: e.target.checked }
                  })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
              </div>
              
              {settings.workingHours.enabled && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={settings.workingHours.startTime}
                      onChange={(e) => setSettings({
                        ...settings,
                        workingHours: { ...settings.workingHours, startTime: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">End Time</label>
                    <input
                      type="time"
                      value={settings.workingHours.endTime}
                      onChange={(e) => setSettings({
                        ...settings,
                        workingHours: { ...settings.workingHours, endTime: e.target.value }
                      })}
                      className="w-full px-3 py-1.5 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Timezone</label>
                    <input
                      type="text"
                      value={settings.workingHours.timezone}
                      disabled
                      className="w-full px-3 py-1.5 border rounded text-sm bg-gray-50"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Working Days */}
            <div className="border rounded-lg p-4">
              <label className="font-medium block mb-3">Working Days</label>
              <div className="grid grid-cols-7 gap-2">
                {Object.entries(settings.workingDays).map(([day, enabled]) => (
                  <label key={day} className="flex flex-col items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setSettings({
                        ...settings,
                        workingDays: { ...settings.workingDays, [day]: e.target.checked }
                      })}
                      className="h-4 w-4 text-blue-600 rounded mb-1"
                    />
                    <span className="text-xs capitalize">{day.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rate Limits */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Daily Message Limit</label>
                <input
                  type="number"
                  value={settings.dailyLimit}
                  onChange={(e) => setSettings({ ...settings, dailyLimit: parseInt(e.target.value) })}
                  min="1"
                  max="500"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Hourly Message Limit</label>
                <input
                  type="number"
                  value={settings.hourlyLimit}
                  onChange={(e) => setSettings({ ...settings, hourlyLimit: parseInt(e.target.value) })}
                  min="1"
                  max="50"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Pause Between Messages */}
            <div className="border rounded-lg p-4">
              <label className="font-medium block mb-3">Pause Between Messages (seconds)</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Minimum</label>
                  <input
                    type="number"
                    value={settings.pauseBetweenMessages.min}
                    onChange={(e) => setSettings({
                      ...settings,
                      pauseBetweenMessages: { 
                        ...settings.pauseBetweenMessages, 
                        min: parseInt(e.target.value) 
                      }
                    })}
                    min="30"
                    max="300"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Maximum</label>
                  <input
                    type="number"
                    value={settings.pauseBetweenMessages.max}
                    onChange={(e) => setSettings({
                      ...settings,
                      pauseBetweenMessages: { 
                        ...settings.pauseBetweenMessages, 
                        max: parseInt(e.target.value) 
                      }
                    })}
                    min="60"
                    max="600"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Random delay between min and max to simulate human behavior
              </p>
            </div>

            {/* Schedule Preview */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">Schedule Preview</p>
                  <p className="text-blue-700">
                    Campaign will run from {settings.startDate} 
                    {settings.endDate && ` to ${settings.endDate}`}
                    {settings.workingHours.enabled && 
                      ` between ${settings.workingHours.startTime} and ${settings.workingHours.endTime}`}
                    , sending up to {settings.dailyLimit} messages per day 
                    ({settings.hourlyLimit} per hour max).
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Schedule Settings'}
        </button>
      </div>
    </div>
  );
}