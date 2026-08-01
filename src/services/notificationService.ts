// Service de notifications en temps réel via Telegram Bot API et Discord Webhooks

export interface NotificationSettings {
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramChatId: string;
  discordEnabled: boolean;
  discordWebhookUrl: string;
  notifyOnTradeExecuted: boolean;
  notifyOnStopLossHit: boolean;
  notifyOnBotSignal: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  telegramEnabled: false,
  telegramBotToken: '',
  telegramChatId: '',
  discordEnabled: false,
  discordWebhookUrl: '',
  notifyOnTradeExecuted: true,
  notifyOnStopLossHit: true,
  notifyOnBotSignal: true,
};

export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const saved = localStorage.getItem('algo_trade_notification_settings');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('algo_trade_notification_settings', JSON.stringify(settings));
}

/**
 * Envoie un message sur Telegram Bot API
 */
export async function sendTelegramNotification(token: string, chatId: string, message: string): Promise<boolean> {
  if (!token || !chatId) return false;
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });
    return res.ok;
  } catch (err) {
    console.warn("Telegram notification error:", err);
    return false;
  }
}

/**
 * Envoie un message sur Webhook Discord
 */
export async function sendDiscordNotification(webhookUrl: string, title: string, description: string, color: number = 0xc2ff0c): Promise<boolean> {
  if (!webhookUrl) return false;
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: title,
          description: description,
          color: color,
          timestamp: new Date().toISOString(),
          footer: { text: "Algo-Trade-AI Alert Engine" }
        }]
      })
    });
    return res.ok;
  } catch (err) {
    console.warn("Discord webhook notification error:", err);
    return false;
  }
}

/**
 * Envoie une alerte générale en fonction des paramètres configurés par l'utilisateur
 */
export async function dispatchAlert(title: string, message: string, type: 'TRADE' | 'STOP_LOSS' | 'BOT_SIGNAL' | 'TEST') {
  const settings = getNotificationSettings();

  const iconMap = {
    TRADE: "📊",
    STOP_LOSS: "🛑 [STOP LOSS URGENT]",
    BOT_SIGNAL: "⚡ [SIGNAL IA]",
    TEST: "🧪 [TEST SYSTEM]"
  };

  const formattedTelegramMsg = `🤖 <b>Algo-Trade-AI Alert</b>\n${iconMap[type]} <b>${title}</b>\n\n${message}\n\n⏱️ <i>${new Date().toLocaleTimeString('fr-FR')}</i>`;

  if (settings.telegramEnabled && settings.telegramBotToken && settings.telegramChatId) {
    await sendTelegramNotification(settings.telegramBotToken, settings.telegramChatId, formattedTelegramMsg);
  }

  if (settings.discordEnabled && settings.discordWebhookUrl) {
    const colorMap = {
      TRADE: 0x3b82f6,      // Bleu
      STOP_LOSS: 0xef4444,  // Rouge
      BOT_SIGNAL: 0xc2ff0c, // Vert fluo
      TEST: 0xa855f7        // Violet
    };
    await sendDiscordNotification(settings.discordWebhookUrl, title, message, colorMap[type]);
  }
}
