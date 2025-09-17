"use client";

import React, { FC, ElementType } from 'react';
import { motion } from 'framer-motion';

interface FunnelBarProps {
    label: string;
    value: number;
    maxValue: number;
    color: string;
    icon: ElementType;
}

/**
 * @summary Mostra una barra de progrés animada per a l'embut de vendes.
 */
export const FunnelBar: FC<FunnelBarProps> = ({ label, value, maxValue, color, icon: Icon }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    
    return (
        <div className="flex items-center gap-4 group">
            <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-lg bg-${color}-500/10 ring-1 ring-${color}-500/20`}>
                <Icon className={`w-6 h-6 text-${color}-400`} />
            </div>
            <div className="w-full">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-sm font-bold">{value}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div 
                        className={`h-full rounded-full bg-gradient-to-r from-${color}-500 to-${color}-400`} 
                        initial={{ width: 0 }} 
                        animate={{ width: `${percentage}%` }} 
                        transition={{ duration: 0.8, ease: "easeOut" }} 
                    />
                </div>
            </div>
        </div>
    );
};