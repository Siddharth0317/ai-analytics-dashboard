import React, { useState } from 'react';
import { Bell, X, CheckCircle2, Send } from 'lucide-react';
import { AlertWebhookService } from '../services/alertWebhookService';
import type { WebhookConfig } from '../services/alertWebhookService';
import type { AIInsight } from '../types/telemetry';

interface WebhookConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WebhookConfigModal: React.FC<WebhookConfigModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const currentCfg = AlertWebhookService.getConfig();
  const [slackUrl, setSlackUrl] = useState(currentCfg.slackUrl);
  const [pagerDutyKey, setPagerDutyKey] = useState(currentCfg.pagerDutyKey);
  const [minSeverity, setMinSeverity] = useState<WebhookConfig['minSeverity']>(currentCfg.minSeverity);
  const [enabled, setEnabled] = useState(currentCfg.enabled);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  const handleSave = () => {
    AlertWebhookService.setConfig({
      slackUrl,
      pagerDutyKey,
      minSeverity,
      enabled
    });
    setTestStatus('Settings saved successfully!');
    setTimeout(() => {
      setTestStatus(null);
      onClose();
    }, 800);
  };

  const handleTestAlert = async () => {
    setTestStatus('Dispatching test alert...');
    const dummyInsight: AIInsight = {
      id: `test_${Date.now()}`,
      timestamp: Date.now(),
      title: 'LATENCY Anomaly Trigger (5.2σ Test Alert)',
      summary: 'Test emergency webhook notification emitted from AI Analytics Dashboard.',
      rootCause: 'Simulated database connection pool exhaustion test.',
      impactScore: 85,
      recommendedAction: 'Verify Slack block kit payload and PagerDuty incident routing.',
      confidence: 0.98,
      metricsAffected: ['latency', 'cpuLoad'],
      tags: ['TestAlert', 'Slack', 'PagerDuty']
    };

    AlertWebhookService.setConfig({ slackUrl, pagerDutyKey, minSeverity, enabled });
    await AlertWebhookService.dispatchAll(dummyInsight);
    setTestStatus('Test alert dispatched to configured Webhooks!');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(7, 10, 18, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '650px',
        padding: '24px',
        position: 'relative'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Bell size={22} color="var(--accent-amber)" />
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>
                AUTOMATED SLACK & PAGERDUTY ALERT WEBHOOKS
              </h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Dispatch real-time AI anomaly alerts directly to DevOps incident response channels
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
          
          {/* Slack Webhook URL */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              Slack Incoming Webhook URL:
            </label>
            <input
              type="text"
              value={slackUrl}
              onChange={(e) => setSlackUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/T00/B00/XXXXX"
              className="font-mono"
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '0.82rem',
                color: '#34d399',
                outline: 'none'
              }}
            />
          </div>

          {/* PagerDuty Routing Key */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
              PagerDuty Events v2 Integration Key (Routing Key):
            </label>
            <input
              type="text"
              value={pagerDutyKey}
              onChange={(e) => setPagerDutyKey(e.target.value)}
              placeholder="pd_routing_key_xxxxxxxxxxxxxxxx"
              className="font-mono"
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '0.82rem',
                color: '#c084fc',
                outline: 'none'
              }}
            />
          </div>

          {/* Min Severity Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Minimum Severity Threshold:
              </label>
              <select
                value={minSeverity}
                onChange={(e) => setMinSeverity(e.target.value as any)}
                style={{
                  width: '100%',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '9px 12px',
                  fontSize: '0.82rem',
                  color: '#ffffff',
                  outline: 'none'
                }}
              >
                <option value="high">High & Critical (Impact &gt; 50%)</option>
                <option value="critical">Critical Only (Impact &gt; 80%)</option>
                <option value="medium">Medium, High & Critical</option>
                <option value="low">All Anomalies (&gt; 3.0σ)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginTop: '22px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: '#ffffff', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)' }}
                />
                Enable Automated Webhook Alerts
              </label>
            </div>
          </div>

          {/* Test Status Banner */}
          {testStatus && (
            <div style={{ background: 'rgba(52, 211, 153, 0.12)', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '10px 14px', borderRadius: '6px', fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} /> {testStatus}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={handleTestAlert}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid rgba(251, 191, 36, 0.4)',
              background: 'rgba(251, 191, 36, 0.15)',
              color: '#fbbf24',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Send size={14} /> Test Fire Webhook Alert
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Save Settings
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
