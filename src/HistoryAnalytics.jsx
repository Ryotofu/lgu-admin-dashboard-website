import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

function HistoryAnalytics({ reports }) {
  const [timeframe, setTimeframe] = useState('monthly'); // 'weekly', 'monthly', 'yearly'

  const chartData = useMemo(() => {
    // 1. Filter only CASE CLOSED or SOLVED reports across all departments
// 1. Unified status evaluator to check if all active agencies closed the case
    const isReportClosed = (r) => {
      if (!r) return false;
      const topStatus = (r.status || '').toUpperCase();
      if (['CASE CLOSED', 'SOLVED', 'RESOLVED'].includes(topStatus)) return true;

      let p = r.policeStatus ? r.policeStatus.toUpperCase() : null;
      let m = (r.medicalStatus || r.healthStatus) ? (r.medicalStatus || r.healthStatus).toUpperCase() : null;
      let f = r.fireStatus ? r.fireStatus.toUpperCase() : null;

      if (!p && !m && !f) return false;

      const cat = `${r.reportCategory || ''} ${r.requestedRole || ''} ${r.incidentTitle || ''} ${r.description || ''}`.toLowerCase();
      const hasFire = cat.includes('fire');
      const hasPolice = cat.includes('police') || cat.includes('security') || cat.includes('crime') || cat.includes('theft') || cat.includes('robbery') || cat.includes('fight') || cat.includes('accident') || cat.includes('traffic') || cat.includes('suspicious');
      const hasMedical = cat.includes('medical') || cat.includes('health') || cat.includes('ambulance');

      const active = [];
      if (hasPolice || (!hasFire && !hasMedical)) active.push(p || 'PENDING');
      if (hasMedical) active.push(m || 'PENDING');
      if (hasFire) active.push(f || 'PENDING');

      return active.length > 0 && active.every(s => ['CASE CLOSED', 'SOLVED', 'RESOLVED', 'N/A'].includes(s));
    };

    const closedReports = reports.filter(isReportClosed);

    // 2. Group the reports based on the selected timeframe
    const groupedData = {};

    closedReports.forEach(report => {
      if (!report.createdAt) return;
      
      const date = report.createdAt.toDate ? report.createdAt.toDate() : new Date(report.createdAt);
      let key = '';

      if (timeframe === 'yearly') {
        key = date.getFullYear().toString();
      } 
      else if (timeframe === 'monthly') {
        key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      } 
      else if (timeframe === 'weekly') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = `Week of ${startOfWeek.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`;
      }

      if (!groupedData[key]) {
        groupedData[key] = 0;
      }
      groupedData[key] += 1;
    });

    // 3. Convert grouped object into an array for Recharts
    return Object.keys(groupedData)
      .map(key => ({
        name: key,
        Cases: groupedData[key]
      }))
      .sort((a, b) => new Date(a.name) - new Date(b.name));

  }, [reports, timeframe]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-black uppercase text-gray-800">Global Resolution Analytics</h2>
          <p className="text-sm text-gray-500 font-bold">Total Closed Cases: {chartData.reduce((sum, item) => sum + item.Cases, 0)}</p>
        </div>
        
        <div className="flex gap-2">
          {['weekly', 'monthly', 'yearly'].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 text-xs font-black uppercase rounded transition-colors ${
                timeframe === tf 
                  ? 'bg-slate-800 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full min-h-[400px]">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 font-bold uppercase">
            No Closed Cases Found
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 'bold'}} stroke="#6B7280" />
              <YAxis allowDecimals={false} tick={{fontSize: 12, fontWeight: 'bold'}} stroke="#6B7280" />
              <Tooltip 
                cursor={{fill: '#F3F4F6'}}
                contentStyle={{ fontWeight: 'bold', borderRadius: '8px' }}
              />
              <Bar dataKey="Cases" fill="#1E293B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default HistoryAnalytics;