import { Zap } from 'lucide-react';

export default function ActiveChats24h({ count }) {
  return (
    <div className="stat-card">
      <Zap className="stat-icon" size={22} />
      <div className="value">{count ?? 0}</div>
      <div className="label">Active chats (Last 24h)</div>
      <div className="stat-description">Sessions created in the past 24 hours</div>
    </div>
  );
}
