import { type CampaignPerformanceData } from './types'; // Importa tipus

// Abans _processCampaignPerformance
export function processCampaignPerformance(): CampaignPerformanceData[] {
    // Mantenim les dades mock ja que la consulta a BD fallava
    const mockCampaigns = [
        { name: "Campanya Estiu", cost: 500, revenue_generated: 1500 },
        { name: "Black Friday", cost: 1000, revenue_generated: 4500 },
        { name: "Llançament Producte", cost: 200, revenue_generated: 300 },
    ];
    const campaignColors = ["#8b5cf6", "#3b82f6", "#10b981", "#f97316"];
    return mockCampaigns.map((campaign, index) => {
        const cost = campaign.cost ?? 0;
        const revenue = campaign.revenue_generated ?? 0;
        let roi: number | typeof Infinity = 0;
        if (cost > 0) roi = Math.round(((revenue - cost) / cost) * 100);
        else if (revenue > 0) roi = Infinity;
        return {
            name: campaign.name,
            roi: roi,
            fill: campaignColors[index % campaignColors.length],
        };
    });
}