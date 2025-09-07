import React from 'react';
import { motion } from 'framer-motion';

const MetricCard = ({ icon: Icon, title, value, colorClassName }) => {
  return (
    <div className="metric-card">
      <Icon className={`w-6 h-6 ${colorClassName} mb-4`} />
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-muted-foreground text-sm">{title}</div>
    </div>
  );
};

export default MetricCard;