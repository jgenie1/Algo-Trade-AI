"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Bell, Send, MessageSquare } from 'lucide-react';
import { NotificationSettings } from '@/services/notificationService';

interface SettingsNotificationsCardProps {
  notifSettings: NotificationSettings;
  setNotifSettings: React.Dispatch<React.SetStateAction<NotificationSettings>>;
  handleTestNotification: () => void;
  isTestingNotif: boolean;
}

export default function SettingsNotificationsCard({
  notifSettings,
  setNotifSettings,
  handleTestNotification,
  isTestingNotif
}: SettingsNotificationsCardProps) {
  return (
    <Card className="bg-[#14101a] border-white/10 rounded-2xl p-6 space-y-5">
      <div className="border-b border-white/5 pb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold font-headline text-emerald-400 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertes & Notifications En Temps Réel (Telegram & Discord)
          </h3>
          <p className="text-xs text-white/40 mt-0.5 font-body">
            Recevez une notification instantanée à chaque exécution d'ordre.
          </p>
        </div>
        <Badge className="bg-emerald-500/15 text-emerald-300 font-mono text-[10px] uppercase border-none">
          WEBHOOKS & TELEGRAM BOT API
        </Badge>
      </div>

      <div className="space-y-4 font-body">
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold font-headline text-white flex items-center gap-2">
              <Send className="h-4 w-4 text-sky-400" /> Bot Telegram
            </label>
            <input
              type="checkbox"
              checked={notifSettings.telegramEnabled}
              onChange={(e) => setNotifSettings({ ...notifSettings, telegramEnabled: e.target.checked })}
              className="h-4 w-4 accent-[#c2ff0c] rounded"
            />
          </div>

          {notifSettings.telegramEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Input
                type="text"
                value={notifSettings.telegramBotToken}
                onChange={(e) => setNotifSettings({ ...notifSettings, telegramBotToken: e.target.value })}
                placeholder="Telegram Bot Token"
                className="h-10 bg-white/5 border-white/10 rounded-xl text-xs font-mono text-white"
              />
              <Input
                type="text"
                value={notifSettings.telegramChatId}
                onChange={(e) => setNotifSettings({ ...notifSettings, telegramChatId: e.target.value })}
                placeholder="Telegram Chat ID"
                className="h-10 bg-white/5 border-white/10 rounded-xl text-xs font-mono text-white"
              />
            </div>
          )}
        </div>

        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold font-headline text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-400" /> Webhook Discord
            </label>
            <input
              type="checkbox"
              checked={notifSettings.discordEnabled}
              onChange={(e) => setNotifSettings({ ...notifSettings, discordEnabled: e.target.checked })}
              className="h-4 w-4 accent-[#c2ff0c] rounded"
            />
          </div>

          {notifSettings.discordEnabled && (
            <Input
              type="text"
              value={notifSettings.discordWebhookUrl}
              onChange={(e) => setNotifSettings({ ...notifSettings, discordWebhookUrl: e.target.value })}
              placeholder="URL Webhook Discord"
              className="h-10 bg-white/5 border-white/10 rounded-xl text-xs font-mono text-white"
            />
          )}
        </div>

        <Button
          type="button"
          onClick={handleTestNotification}
          disabled={isTestingNotif}
          variant="outline"
          className="h-9 px-4 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30 rounded-xl text-xs font-bold font-headline flex items-center gap-2"
        >
          <Bell className="h-3.5 w-3.5" />
          {isTestingNotif ? 'Envoi du test...' : 'Tester Les Notifications'}
        </Button>
      </div>
    </Card>
  );
}
