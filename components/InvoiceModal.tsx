
import React from 'react';
import { useSettings } from '../App';
import { Shipment, Invoice } from '../types';

interface InvoiceModalProps {
    shipment: Shipment;
    invoice: Invoice;
    onClose: () => void;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ shipment, invoice, onClose }) => {
    const { settings } = useSettings();

    const handlePrint = () => {
        const printContents = document.getElementById('invoice-print-area')?.innerHTML;
        if (printContents) {
            const printWindow = window.open('', '', 'height=800,width=800');
            printWindow?.document.write('<html><head><title>Invoice</title>');
            printWindow?.document.write('<script src="https://cdn.tailwindcss.com"></script>');
            printWindow?.document.write('<style> @media print { body { -webkit-print-color-adjust: exact; } } </style>');
            printWindow?.document.write('</head><body>');
            printWindow?.document.write(printContents);
            printWindow?.document.write('</body></html>');
            printWindow?.document.close();
            printWindow?.focus();
            setTimeout(() => {
                printWindow?.print();
                printWindow?.close();
            }, 250);
        }
    };
    
    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full text-gray-800 dark:text-gray-200 flex flex-col max-h-[95vh]">
                <div id="invoice-print-area" className="p-10 overflow-y-auto">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <img src="http://qgocargo.com/logo.png" alt="Company Logo" className="h-16 mb-4" />
                            <h1 className="text-3xl font-bold text-gray-900">{settings?.companyName || 'Warehouse'}</h1>
                            <p>123 Industrial Way, Suite 100</p>
                            <p>Kuwait City, Kuwait</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-4xl font-bold uppercase text-gray-400">Invoice</h2>
                            <p className="mt-2"><strong>Invoice #:</strong> {String(invoice.id).padStart(6, '0')}</p>
                            <p><strong>Date of Issue:</strong> {new Date(invoice.releaseDate).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Billing Info */}
                    <div className="grid grid-cols-2 gap-8 mb-10">
                        <div className="bg-gray-100 p-4 rounded-lg">
                            <h3 className="font-semibold text-gray-500 mb-2">BILLED TO</h3>
                            <p className="font-bold">{shipment.consignee}</p>
                        </div>
                        <div className="bg-gray-100 p-4 rounded-lg">
                             <h3 className="font-semibold text-gray-500 mb-2">SHIPPED FROM</h3>
                            <p className="font-bold">{shipment.shipper}</p>
                        </div>
                    </div>
                    
                    {/* Shipment Details Summary */}
                    <div className="mb-10">
                         <h3 className="font-semibold border-b pb-2 mb-2">Shipment Summary</h3>
                         <div className="grid grid-cols-4 gap-2 text-sm">
                            <div><strong>Shipment ID:</strong> {shipment.id}</div>
                            <div><strong>Arrival:</strong> {new Date(shipment.arrivalDate).toLocaleDateString()}</div>
                            <div><strong>Release:</strong> {new Date(invoice.releaseDate).toLocaleDateString()}</div>
                            <div><strong>Rack ID:</strong> {shipment.rackId}</div>
                            <div><strong>Weight:</strong> {shipment.weight} kg</div>
                            <div><strong>Pieces:</strong> {shipment.pieces}</div>
                         </div>
                    </div>

                    {/* Charges Table */}
                    <table className="min-w-full divide-y divide-gray-200 mb-6">
                        <thead className="bg-gray-800 text-white">
                            <tr>
                                <th className="px-4 py-2 text-left text-sm font-semibold">Service Description</th>
                                <th className="px-4 py-2 text-right text-sm font-semibold">Unit Price</th>
                                <th className="px-4 py-2 text-right text-sm font-semibold">Quantity</th>
                                <th className="px-4 py-2 text-right text-sm font-semibold">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white">
                            {invoice.chargeDetails.map(item => (
                                <tr key={item.name} className="border-b">
                                    <td className="px-4 py-3">{item.name}</td>
                                    <td className="px-4 py-3 text-right">{item.rate.toFixed(3)} {invoice.currency}</td>
                                    <td className="px-4 py-3 text-right">{item.quantity} {item.unit}</td>
                                    <td className="px-4 py-3 text-right font-semibold">{item.total.toFixed(3)} {invoice.currency}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {/* Totals Section */}
                    <div className="flex justify-end mb-10">
                         <div className="w-1/3">
                             <div className="flex justify-between py-1">
                                <span>Subtotal</span>
                                <span>{invoice.totalAmount.toFixed(3)} {invoice.currency}</span>
                             </div>
                              <div className="flex justify-between py-1 font-bold text-xl border-t-2 mt-2 pt-2">
                                <span>GRAND TOTAL</span>
                                <span>{invoice.totalAmount.toFixed(3)} {invoice.currency}</span>
                             </div>
                         </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="border-t pt-6 text-sm text-gray-600">
                        <p className="font-semibold mb-2">Payment Details:</p>
                        <p>Bank Name: National Bank of WMS</p>
                        <p>Account Number: 123-456-7890</p>
                        <p>IBAN: KW86 NBOK 0000 0000 0000 1234 5678 90</p>
                        <p className="text-center mt-8 font-bold">Thank you for your business!</p>
                    </div>

                </div>
                 <div className="p-4 bg-gray-100 dark:bg-gray-900 border-t flex justify-end space-x-4">
                    <button onClick={handlePrint} className="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700">Print</button>
                    <button onClick={onClose} className="px-6 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700">Close</button>
                </div>
            </div>
        </div>
    );
};

export default InvoiceModal;
