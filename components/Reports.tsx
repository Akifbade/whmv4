
import React, { useState } from 'react';
import { useWMSData } from '../hooks/useWMSData';
import { InventoryReportItem, TurnoverDataPoint } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


type ReportType = 'inventory' | 'turnover';

const Reports: React.FC<ReturnType<typeof useWMSData>> = ({ generateInventoryReport, generateTurnoverReport }) => {
    const [reportType, setReportType] = useState<ReportType>('inventory');
    const [dates, setDates] = useState({ start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] });
    const [reportData, setReportData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        setIsLoading(true);
        setReportData(null);
        try {
            if (reportType === 'inventory') {
                const data = await generateInventoryReport();
                setReportData(data);
            } else {
                const data = await generateTurnoverReport(dates.start, dates.end);
                setReportData(data);
            }
        } catch (error) {
            console.error("Failed to generate report", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        const printContent = document.getElementById('report-area')?.innerHTML;
        if(printContent) {
            const printWindow = window.open('', '', 'height=800,width=1000');
            printWindow?.document.write('<html><head><title>WMS Report</title>');
            printWindow?.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            printWindow?.document.write('</head><body class="p-4">');
            printWindow?.document.write(printContent);
            printWindow?.document.write('</body></html>');
            printWindow?.document.close();
            printWindow?.focus();
            setTimeout(() => { printWindow?.print(); printWindow?.close(); }, 250);
        }
    }

    const renderReport = () => {
        if (isLoading) return <p>Generating Report...</p>;
        if (!reportData) return <p className="text-center text-gray-500">Please generate a report to see data.</p>;
        
        if (reportType === 'inventory') {
            const data = reportData as InventoryReportItem[];
            return (
                <div id="report-area">
                    <h3 className="text-2xl font-bold mb-4">Inventory Report</h3>
                    <p className="mb-4"><strong>Total Items in Storage:</strong> {data.length}</p>
                    <table className="min-w-full bg-white dark:bg-gray-800">
                        <thead><tr><th>Shipment ID</th><th>Rack ID</th><th>Shipper</th><th>Consignee</th><th>Arrival Date</th><th>Days in Storage</th></tr></thead>
                        <tbody>
                            {data.map(item => (
                                <tr key={item.id}>
                                    <td>{item.id}</td><td>{item.rackId}</td><td>{item.shipper}</td>
                                    <td>{item.consignee}</td><td>{new Date(item.arrivalDate).toLocaleDateString()}</td><td>{item.daysInStorage}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }
        
        if (reportType === 'turnover') {
            const { inbound, outbound } = reportData as { inbound: TurnoverDataPoint[], outbound: TurnoverDataPoint[] };
            const combinedData = [...inbound, ...outbound].reduce((acc, item) => {
                acc[item.date] = acc[item.date] || { date: new Date(item.date).toLocaleDateString() };
                if (inbound.includes(item)) acc[item.date].inbound = item.count;
                if (outbound.includes(item)) acc[item.date].outbound = item.count;
                return acc;
            }, {} as Record<string, any>);

            const chartData = Object.values(combinedData).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            return (
                <div id="report-area">
                    <h3 className="text-2xl font-bold mb-4">Turnover Report ({new Date(dates.start).toLocaleDateString()} - {new Date(dates.end).toLocaleDateString()})</h3>
                    <p className="mb-4"><strong>Total Inbound:</strong> {inbound.reduce((sum, i) => sum + i.count, 0)} | <strong>Total Outbound:</strong> {outbound.reduce((sum, o) => sum + o.count, 0)}</p>
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="inbound" fill="var(--color-primary-500)" />
                            <Bar dataKey="outbound" fill="#84cc16" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }
        return null;
    };


    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Reports</h2>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6 flex flex-wrap items-end gap-4">
                <div>
                    <label className="block text-sm font-medium">Report Type</label>
                    <select value={reportType} onChange={e => setReportType(e.target.value as ReportType)} className="p-2 border rounded-md dark:bg-gray-700">
                        <option value="inventory">Inventory on Hand</option>
                        <option value="turnover">Shipment Turnover</option>
                    </select>
                </div>
                {reportType === 'turnover' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium">Start Date</label>
                            <input type="date" value={dates.start} onChange={e => setDates(d => ({...d, start: e.target.value}))} className="p-2 border rounded-md dark:bg-gray-700"/>
                        </div>
                        <div>
                             <label className="block text-sm font-medium">End Date</label>
                            <input type="date" value={dates.end} onChange={e => setDates(d => ({...d, end: e.target.value}))} className="p-2 border rounded-md dark:bg-gray-700"/>
                        </div>
                    </>
                )}
                <button onClick={handleGenerate} disabled={isLoading} className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
                    {isLoading ? 'Generating...' : 'Generate Report'}
                </button>
                 {reportData && <button onClick={handlePrint} className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">Print</button>}
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                {renderReport()}
            </div>
            
            <style>{`
                #report-area table { width: 100%; border-collapse: collapse; }
                #report-area th, #report-area td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
                #report-area thead { background-color: #f8fafc; }
                .dark #report-area th, .dark #report-area td { border-color: #4a5568; }
                .dark #report-area thead { background-color: #1f2937; }
            `}</style>
        </div>
    );
};

export default Reports;
