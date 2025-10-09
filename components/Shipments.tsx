import React, { useState, FormEvent } from 'react';
import QRCode from 'react-qr-code';
// FIX: Imported RackStatus to be used in the WarehouseHeatmapModal component.
import { Shipment, UserRole, ShipmentStatus, Rack, Invoice, RackStatus } from '../types';
import { suggestRackPlacement } from '../services/geminiService';
import { useWMSData } from '../hooks/useWMSData';
import { useAuth } from '../App';

interface ShipmentsProps extends ReturnType<typeof useWMSData> {
  showToast: (message: string, type: 'success' | 'error') => void;
}

const PrintLabelsModal: React.FC<{ shipment: Shipment; onClose: () => void }> = ({ shipment, onClose }) => {
    // This modal's print functionality remains largely the same
    const handlePrint = () => {
        const printContents = document.getElementById('printable-labels-area')?.innerHTML;
        const originalContents = document.body.innerHTML;
        if (printContents) {
            document.body.innerHTML = `<div class="print-container">${printContents}</div>`;
            window.print();
            document.body.innerHTML = originalContents;
            window.location.reload();
        }
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-4xl w-full max-h-[90vh] flex flex-col">
                <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Print Labels for Shipment {shipment.id}</h3>
                <div id="printable-labels-area" className="overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-2">
                    {Array.from({ length: shipment.pieces }).map((_, index) => (
                        <div key={index} className="flex flex-col items-center text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                            <div className="p-2 bg-white rounded-md"><QRCode value={JSON.stringify({ shipmentId: shipment.id })} size={128} /></div>
                            <p className="mt-2 font-semibold text-gray-800 dark:text-gray-200">{shipment.id}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Piece {index + 1} of {shipment.pieces}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-4 border-t dark:border-gray-600 flex justify-end items-center space-x-4">
                    <button onClick={handlePrint} className="px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-green-600 rounded-md hover:bg-green-700">Print</button>
                    <button onClick={onClose} className="px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-700">Close</button>
                </div>
            </div>
        </div>
    );
};

const WarehouseHeatmapModal: React.FC<{ 
    racks: Rack[];
    onClose: () => void;
    onSelectRack: (rackId: string) => void;
}> = ({ racks, onClose, onSelectRack }) => {
    const groupedRacks = racks.reduce((acc, rack) => {
        if (!acc[rack.rackLine]) acc[rack.rackLine] = [];
        acc[rack.rackLine].push(rack);
        return acc;
    }, {} as Record<string, Rack[]>);

    const getStatusColor = (rack: Rack) => {
        if (rack.status === RackStatus.Full) return 'bg-red-500 cursor-not-allowed';
        if (rack.status === RackStatus.Free) return 'bg-green-500 hover:bg-green-400';
        return 'bg-orange-500 hover:bg-orange-400';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-6xl w-full max-h-[90vh] flex flex-col">
                <h3 className="text-2xl font-bold mb-4">Warehouse Heatmap - Select a Rack</h3>
                <div className="overflow-auto space-y-6">
                    {Object.entries(groupedRacks).map(([line, rackList]) => (
                        <div key={line}>
                            <h4 className="font-semibold text-lg mb-2">{line}</h4>
                            <div className="flex flex-wrap gap-2">
                                {rackList.sort((a,b) => a.slot.localeCompare(b.slot)).map(rack => (
                                    <button 
                                        key={rack.id}
                                        disabled={rack.status === RackStatus.Full}
                                        onClick={() => onSelectRack(rack.id)}
                                        className={`p-2 rounded text-white text-sm w-24 h-16 flex flex-col justify-center items-center transition-transform transform hover:scale-105 ${getStatusColor(rack)}`}
                                    >
                                        <span className="font-bold">{rack.slot}</span>
                                        <span className="text-xs">({rack.currentLoad}/{rack.capacity})</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={onClose} className="mt-6 w-full px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-gray-600 rounded-md hover:bg-gray-700">Cancel</button>
            </div>
        </div>
    );
};

const InvoiceModal: React.FC<{
    shipment: Shipment;
    invoice: Invoice | null;
    onClose: () => void;
}> = ({ shipment, invoice, onClose }) => {
    if (!invoice) return null;
    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-2xl w-full text-gray-800 dark:text-gray-200">
                <h3 className="text-3xl font-bold mb-4 text-center">Tax Invoice</h3>
                <p className="text-center mb-6">Invoice #{invoice.id}</p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div><strong>Shipment ID:</strong> {shipment.id}</div>
                    <div><strong>Release Date:</strong> {new Date(invoice.releaseDate).toLocaleDateString()}</div>
                    <div><strong>Shipper:</strong> {shipment.shipper}</div>
                    <div><strong>Consignee:</strong> {shipment.consignee}</div>
                </div>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 mb-6">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-4 py-2 text-left">Service</th>
                            <th className="px-4 py-2 text-right">Rate</th>
                            <th className="px-4 py-2 text-right">Quantity</th>
                            <th className="px-4 py-2 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800">
                        {invoice.chargeDetails.map(item => (
                            <tr key={item.name}>
                                <td className="px-4 py-2">{item.name}</td>
                                <td className="px-4 py-2 text-right">{item.rate.toFixed(3)} {invoice.currency}</td>
                                <td className="px-4 py-2 text-right">{item.quantity} {item.unit}</td>
                                <td className="px-4 py-2 text-right">{item.total.toFixed(3)} {invoice.currency}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="text-right text-2xl font-bold">
                    Total: {invoice.totalAmount.toFixed(3)} {invoice.currency}
                </div>
                 <div className="mt-8 flex justify-end space-x-4">
                    <button onClick={() => window.print()} className="px-6 py-2 text-white bg-green-600 rounded-md hover:bg-green-700">Print</button>
                    <button onClick={onClose} className="px-6 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700">Close</button>
                </div>
            </div>
        </div>
    );
};

const ReleaseModal: React.FC<{
    shipment: Shipment;
    chargeSettings: any[];
    onClose: () => void;
    onConfirm: (chargeOverrides: any) => void;
}> = ({ shipment, chargeSettings, onClose, onConfirm }) => {
    const [overrides, setOverrides] = useState<any>({});
    const durationDays = Math.ceil((new Date().getTime() - new Date(shipment.arrivalDate).getTime()) / (1000 * 3600 * 24));

    const handleOverrideChange = (name: string, field: 'rate' | 'value', value: string) => {
        setOverrides(prev => ({
            ...prev,
            [name]: { ...prev[name], [field]: parseFloat(value) }
        }));
    };

    const calculateTotal = () => {
        return chargeSettings.reduce((total, setting) => {
            const override = overrides[setting.name] || {};
            const rate = override.rate ?? setting.rate;
            let quantity = 1;
            if (setting.unit === 'per day') quantity = durationDays;
            quantity = override.value ?? quantity;
            return total + (rate * quantity);
        }, 0);
    }
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-2xl w-full">
                <h3 className="text-2xl font-bold mb-4">Release Shipment {shipment.id}</h3>
                <p className="mb-6">Review and confirm charges before releasing.</p>
                <div className="space-y-2">
                    {chargeSettings.map(setting => (
                         <div key={setting.id} className="grid grid-cols-4 gap-2 items-center">
                            <span>{setting.name}</span>
                            <input type="number" step="0.001" value={overrides[setting.name]?.rate ?? setting.rate} onChange={e => handleOverrideChange(setting.name, 'rate', e.target.value)} className="w-full p-1 border rounded dark:bg-gray-700"/>
                            <input type="number" value={overrides[setting.name]?.value ?? (setting.unit === 'per day' ? durationDays : 1)} onChange={e => handleOverrideChange(setting.name, 'value', e.target.value)} className="w-full p-1 border rounded dark:bg-gray-700" />
                            <span>{setting.unit}</span>
                         </div>
                    ))}
                </div>
                <div className="mt-4 text-right font-bold text-xl">
                    Total: {calculateTotal().toFixed(3)} KWD
                </div>
                <div className="mt-8 flex justify-end space-x-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-300 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button onClick={() => onConfirm(overrides)} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Confirm & Release</button>
                </div>
            </div>
        </div>
    );
}


const Shipments: React.FC<ShipmentsProps> = ({ shipments, racks, addShipment, releaseShipment, assignShipmentToRack, getInvoice, chargeSettings, fetchChargeSettings, showToast }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [shipmentToRelease, setShipmentToRelease] = useState<Shipment | null>(null);
  const [shipmentToAssign, setShipmentToAssign] = useState<Shipment | null>(null);
  const [shipmentToPrint, setShipmentToPrint] = useState<Shipment | null>(null);
  const [invoiceToShow, setInvoiceToShow] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({ shipper: '', consignee: '', weight: '', pieces: '' });
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  
  React.useEffect(() => { if (user?.role === 'Admin') fetchChargeSettings() }, [user, fetchChargeSettings]);

  const hasAccess = (requiredRoles: UserRole[]) => user && requiredRoles.includes(user.role);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newShipmentData = {
        shipper: formData.shipper, consignee: formData.consignee,
        weight: parseFloat(formData.weight), pieces: parseInt(formData.pieces, 10),
    };
    try {
        const createdShipment = await addShipment(newShipmentData);
        setFormData({ shipper: '', consignee: '', weight: '', pieces: '' });
        setSuggestion(null);
        setShipmentToPrint(createdShipment);
        setActiveTab('all');
        showToast(`Shipment ${createdShipment.id} created successfully.`, 'success');
    } catch(error: any) { showToast(error.message, 'error'); }
  };
  
  const handleConfirmRelease = async (chargeOverrides: any) => {
      if (!shipmentToRelease) return;
      try {
        await releaseShipment(shipmentToRelease.id, chargeOverrides);
        showToast(`Shipment ${shipmentToRelease.id} released.`, 'success');
        setShipmentToRelease(null);
      } catch (error: any) { showToast(error.message, 'error'); }
  }

  const handleManualAssign = async (rackId: string) => {
      if (!shipmentToAssign) return;
      try {
          await assignShipmentToRack(shipmentToAssign.id, rackId);
          showToast(`Shipment ${shipmentToAssign.id} assigned to ${rackId}`, 'success');
          setShipmentToAssign(null);
          setSelectedShipment(null);
      } catch (error: any) { showToast(error.message, 'error'); }
  };

  const handleViewInvoice = async (shipment: Shipment) => {
      try {
        const invoiceData = await getInvoice(shipment.id);
        if (invoiceData) {
            setInvoiceToShow(invoiceData);
            setSelectedShipment(shipment); // Keep shipment context
        } else {
            showToast('No invoice found for this shipment.', 'error');
        }
      } catch (error: any) { showToast(error.message, 'error'); }
  }

  const filteredShipments = shipments.filter(s => {
      if(activeTab === 'released') return s.status === ShipmentStatus.Released;
      return s.status !== ShipmentStatus.Released;
  });

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Shipment Management</h2>
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setActiveTab('all')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'all' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}>Active Shipments</button>
        <button onClick={() => setActiveTab('released')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'released' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}>Released</button>
        {hasAccess([UserRole.Admin, UserRole.Worker]) && <button onClick={() => setActiveTab('add')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'add' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500'}`}>Add New Shipment</button>}
      </div>

      <div className="mt-6">
        {(activeTab === 'all' || activeTab === 'released') && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['ID', 'Shipper', 'Consignee', 'Status', 'Actions'].map(header => <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>)}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredShipments.map(shipment => (
                  <tr key={shipment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{shipment.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{shipment.shipper}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{shipment.consignee}</td>
                    <td className="px-6 py-4"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${shipment.status === 'Stored' ? 'bg-green-100 text-green-800' : shipment.status === 'Intake' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{shipment.status}</span></td>
                    <td className="px-6 py-4 text-sm font-medium">
                        <button onClick={() => setSelectedShipment(shipment)} className="text-blue-600 hover:text-blue-900 mr-4">Details</button>
                        {shipment.status === 'Released' && hasAccess([UserRole.Admin, UserRole.Billing]) && <button onClick={() => handleViewInvoice(shipment)} className="text-green-600 hover:text-green-900">View Invoice</button>}
                        {shipment.status === 'Stored' && hasAccess([UserRole.Admin, UserRole.Supervisor, UserRole.Billing]) && <button onClick={() => setShipmentToRelease(shipment)} className="text-indigo-600 hover:text-indigo-900">Release</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {activeTab === 'add' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 max-w-lg mx-auto">
            <form onSubmit={handleSubmit}>
                {/* Form inputs are the same */}
                 <div className="grid grid-cols-1 gap-6">
                    <input type="text" name="shipper" value={formData.shipper} onChange={e => setFormData({...formData, shipper: e.target.value})} placeholder="Shipper" className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-md dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:ring-blue-300 focus:ring-opacity-40" required />
                    <input type="text" name="consignee" value={formData.consignee} onChange={e => setFormData({...formData, consignee: e.target.value})} placeholder="Consignee" className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-md dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:ring-blue-300 focus:ring-opacity-40" required />
                    <input type="number" name="weight" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} placeholder="Weight (kg)" className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-md dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:ring-blue-300 focus:ring-opacity-40" required />
                    <input type="number" name="pieces" value={formData.pieces} onChange={e => setFormData({...formData, pieces: e.target.value})} placeholder="Pieces" className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-md dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:ring-blue-300 focus:ring-opacity-40" required />
                </div>
              <div className="mt-6 flex items-center justify-between">
                <button type="submit" className="px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-700">Add Shipment</button>
              </div>
            </form>
          </div>
        )}
      </div>

      {shipmentToPrint && <PrintLabelsModal shipment={shipmentToPrint} onClose={() => setShipmentToPrint(null)} />}
      {shipmentToAssign && <WarehouseHeatmapModal racks={racks} onClose={() => setShipmentToAssign(null)} onSelectRack={handleManualAssign} />}
      {shipmentToRelease && <ReleaseModal shipment={shipmentToRelease} chargeSettings={chargeSettings} onClose={() => setShipmentToRelease(null)} onConfirm={handleConfirmRelease} />}
      {invoiceToShow && selectedShipment && <InvoiceModal shipment={selectedShipment} invoice={invoiceToShow} onClose={() => { setInvoiceToShow(null); setSelectedShipment(null); }} />}

      {selectedShipment && !invoiceToShow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">Shipment {selectedShipment.id}</h3>
            {/* Details are the same */}
            <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <p><strong>Shipper:</strong> {selectedShipment.shipper}</p>
                <p><strong>Consignee:</strong> {selectedShipment.consignee}</p>
                <p><strong>Weight:</strong> {selectedShipment.weight} kg, <strong>Pieces:</strong> {selectedShipment.pieces}</p>
                <p><strong>Arrival:</strong> {new Date(selectedShipment.arrivalDate).toLocaleString()}</p>
                <p><strong>Status:</strong> {selectedShipment.status}, <strong>Rack:</strong> {selectedShipment.rackId || 'N/A'}</p>
            </div>
            {selectedShipment.status === ShipmentStatus.Intake && hasAccess([UserRole.Admin, UserRole.Supervisor]) && (
                <button onClick={() => setShipmentToAssign(selectedShipment)} className="mt-6 w-full px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-green-600 rounded-md hover:bg-green-700">
                    Manual Assign to Rack
                </button>
            )}
            <button onClick={() => setSelectedShipment(null)} className="mt-4 w-full px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-700">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shipments;