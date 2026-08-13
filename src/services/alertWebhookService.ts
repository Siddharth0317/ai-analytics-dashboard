import type { AIInsight } from '../types/telemetry';

export interface WebhookConfig {
  slackUrl: string;
  pagerDutyKey: string;
  minSeverity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export class AlertWebhookService {
  private static config: WebhookConfig = {
    slackUrl: '',
    pagerDutyKey: '',
    minSeverity: 'high',
    enabled: true
  };

  public static setConfig(newConfig: Partial<WebhookConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public static getConfig(): WebhookConfig {
    return this.config;
  }

  /**
   * Dispatch automated alert to Slack Block Kit API
   */
  public static async sendSlackAlert(insight: AIInsight): Promise<boolean> {
    if (!this.config.slackUrl || !this.config.enabled) return false;

    const payload = {
      text: `🚨 *AI ANOMALY ALERT: ${insight.title}*`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `🚨 ${insight.title}`, emoji: true }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Impact Score:* ${insight.impactScore}%` },
            { type: 'mrkdwn', text: `*Confidence:* ${(insight.confidence * 100).toFixed(0)}%` },
            { type: 'mrkdwn', text: `*Affected Metrics:* ${insight.metricsAffected.join(', ')}` },
            { type: 'mrkdwn', text: `*Timestamp:* ${new Date(insight.timestamp).toLocaleTimeString()}` }
          ]
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Summary:*\n${insight.summary}` }
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*🧠 AI Root Cause Analysis:*\n\`${insight.rootCause}\`` }
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*✅ Recommended Action:*\n${insight.recommendedAction}` }
        }
      ]
    };

    try {
      const resp = await fetch(this.config.slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return resp.ok;
    } catch (err) {
      console.warn('[Webhook] Slack dispatch warning:', err);
      return false;
    }
  }

  /**
   * Dispatch automated incident trigger to PagerDuty Events v2 API
   */
  public static async sendPagerDutyIncident(insight: AIInsight): Promise<boolean> {
    if (!this.config.pagerDutyKey || !this.config.enabled) return false;

    const pdSeverity = insight.impactScore >= 80 ? 'critical' : insight.impactScore >= 50 ? 'error' : 'warning';

    const payload = {
      routing_key: this.config.pagerDutyKey,
      event_action: 'trigger',
      dedup_key: insight.id,
      payload: {
        summary: insight.title,
        source: 'Enterprise-AI-Analytics-Dashboard',
        severity: pdSeverity,
        timestamp: new Date(insight.timestamp).toISOString(),
        component: insight.metricsAffected[0] || 'telemetry-engine',
        custom_details: {
          root_cause: insight.rootCause,
          recommended_action: insight.recommendedAction,
          impact_score: insight.impactScore,
          confidence: insight.confidence
        }
      }
    };

    try {
      const resp = await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return resp.ok;
    } catch (err) {
      console.warn('[Webhook] PagerDuty dispatch warning:', err);
      return false;
    }
  }

  /**
   * Trigger all configured Webhooks for a newly detected insight
   */
  public static async dispatchAll(insight: AIInsight): Promise<void> {
    if (!this.config.enabled) return;

    // Filter by minimum severity threshold
    const severities = ['low', 'medium', 'high', 'critical'];
    const minIdx = severities.indexOf(this.config.minSeverity);
    const insightSevIdx = insight.impactScore >= 80 ? 3 : insight.impactScore >= 50 ? 2 : insight.impactScore >= 30 ? 1 : 0;

    if (insightSevIdx >= minIdx) {
      console.log(`[Alert Webhooks] Dispatching Slack & PagerDuty alerts for anomaly: ${insight.title}`);
      await Promise.allSettled([
        this.sendSlackAlert(insight),
        this.sendPagerDutyIncident(insight)
      ]);
    }
  }
}
