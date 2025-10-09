

import React, { useState, FormEvent, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Shipment, UserRole, ShipmentStatus, Rack, Invoice, RackStatus, ChargeSetting, CustomField } from '../types';
import { useWMSData } from '../hooks/useWMSData';
import { useAuth } from '../App';
import InvoiceModal from './InvoiceModal';

interface ShipmentsProps extends ReturnType<typeof useWMSData> {
  showToast: (message: string, type: 'success' | 'error') => void;
}

const PrintLabelsModal: React.FC<{ shipment: Shipment; onClose: () => void }> = ({ shipment, onClose }) => {
    const handlePrint = () => {
        const printContents = document.getElementById('printable-labels-area')?.innerHTML;
        const originalContents = document.body.innerHTML;
        const styles = Array.from(document.styleSheets)
            .map(styleSheet => {
                try {
                    return Array.from(styleSheet.cssRules)
                        .map(rule => rule.cssText)
                        .join('');
                } catch (e) {
                    console.warn('Cannot read cross-origin stylesheet');
                    return '';
                }
            })
            .join('\n');
            
        if (printContents) {
            const printWindow = window.open('', '', 'height=600,width=800');
            printWindow?.document.write('<html><head><title>Print Labels</title>');
            printWindow?.document.write('<style>');
            printWindow?.document.write(styles);
            printWindow?.document.write(`
                @media print {
                    body { -webkit-print-color-adjust: exact; }
                    .label-container { 
                        page-break-inside: avoid; 
                        border: 1px solid #ccc !important;
                        padding: 1rem !important;
                        background-color: #f9fafb !important;
                        border-radius: 0.5rem !important;
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        text-align: center !important;
                    }
                    .qr-wrapper { background-color: white !important; padding: 0.5rem !important; border-radius: 0.25rem !important; }
                }
                .print-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
            `);
            printWindow?.document.write('</style></head><body>');
            printWindow?.document.write(`<div class="print-grid">${printContents}</div>`);
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-4xl w-full max-h-[90vh] flex flex-col">
                <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Print Labels for Shipment {shipment.id}</h3>
                <div id="printable-labels-area" className="overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-2">
                    {Array.from({ length: shipment.pieces }).map((_, index) => (
                        <div key={index} className="label-container flex flex-col items-center text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                            <div className="qr-wrapper p-2 bg-white rounded-md"><QRCode value={JSON.stringify({ shipmentId: shipment.id })} size={128} /></div>
                            <p className="mt-2 font-semibold text-gray-800 dark:text-gray-200">{shipment.id}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Piece {index + 1} of {shipment.pieces}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-4 border-t dark:border-gray-600 flex justify-end items-center space-x-4">
                    <button onClick={handlePrint} className="px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-green-600 rounded-md hover:bg-green-700">Print</button>
                    <button onClick={onClose} className="px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-primary-600 rounded-md hover:bg-primary-700">Close</button>
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
    // FIX: Explicitly typing the accumulator in the reduce callback to fix type inference issues.
    const groupedRacks = racks.reduce<Record<string, Rack[]>>((acc, rack) => {
        (acc[rack.rackLine] = acc[rack.rackLine] || []).push(rack);
        return acc;
    }, {});

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
                    {Object.entries(groupedRacks).sort((a, b) => a[0].localeCompare(b[0])).map(([line, rackList]) => (
                        <div key={line}>
                            <h4 className="font-semibold text-lg mb-2">{line}</h4>
                            <div className="flex flex-wrap gap-2">
                                {[...rackList].sort((a,b) => a.slot.localeCompare(b.slot)).map(rack => (
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


const ReleaseModal: React.FC<{
    shipment: Shipment;
    chargeSettings: ChargeSetting[];
    onClose: () => void;
    onConfirm: (charges: { chargeId: number, quantity: number }[]) => void;
}> = ({ shipment, chargeSettings, onClose, onConfirm }) => {
    const durationDays = Math.max(1, Math.ceil((new Date().getTime() - new Date(shipment.arrivalDate).getTime()) / (1000 * 3600 * 24)));
    
    // Initialize with storage charge
    const storageSetting = chargeSettings.find(s => s.name === 'Storage');
    const initialCharges = storageSetting ? [{ chargeId: storageSetting.id, quantity: durationDays, name: storageSetting.name, rate: storageSetting.rate, unit: storageSetting.unit }] : [];
    
    const [charges, setCharges] = useState(initialCharges);

    const handleQuantityChange = (chargeId: number, quantity: string) => {
        setCharges(prev => prev.map(c => c.chargeId === chargeId ? { ...c, quantity: parseInt(quantity, 10) || 0 } : c));
    };

    const handleAddCharge = (setting: ChargeSetting) => {
        if (!charges.some(c => c.chargeId === setting.id)) {
            setCharges(prev => [...prev, { ...setting, quantity: 1 }]);
        }
    };
    
    const handleRemoveCharge = (chargeId: number) => {
        setCharges(prev => prev.filter(c => c.chargeId !== chargeId));
    };

    const calculateTotal = () => {
        return charges.reduce((total, charge) => total + (charge.rate * charge.quantity), 0);
    };
    
    const availableCharges = chargeSettings.filter(setting => !charges.some(c => c.chargeId === setting.id));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-3xl w-full">
                <h3 className="text-2xl font-bold mb-4">Release Shipment {shipment.id}</h3>
                <p className="mb-6">Confirm charges before releasing. Storage duration: {durationDays} days.</p>
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {charges.map(charge => (
                        <div key={charge.chargeId} className="grid grid-cols-12 gap-3 items-center">
                            <span className="col-span-4">{charge.name}</span>
                            <span className="col-span-2 text-right">{charge.rate.toFixed(3)}</span>
                            <input type="number" value={charge.quantity} onChange={e => handleQuantityChange(charge.chargeId, e.target.value)} className="col-span-2 p-1 border rounded dark:bg-gray-700"/>
                            <span className="col-span-2">{charge.unit}</span>
                            <span className="col-span-1 text-right font-semibold">{(charge.rate * charge.quantity).toFixed(3)}</span>
                            <button onClick={() => handleRemoveCharge(charge.chargeId)} className="col-span-1 text-red-500 hover:text-red-700">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    ))}
                </div>
                 <div className="mt-4 pt-4 border-t dark:border-gray-600">
                    {availableCharges.length > 0 && (
                        <div className="flex items-center gap-2">
                            <select onChange={(e) => handleAddCharge(JSON.parse(e.target.value))} className="p-2 border rounded dark:bg-gray-700">
                                <option>Add another charge...</option>
                                {availableCharges.map(s => <option key={s.id} value={JSON.stringify(s)}>{s.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <div className="mt-4 text-right font-bold text-xl">
                    Total: {calculateTotal().toFixed(3)} KWD
                </div>
                <div className="mt-8 flex justify-end space-x-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-300 dark:bg-gray-600 rounded-md">Cancel</button>
                    <button onClick={() => onConfirm(charges.map(({chargeId, quantity}) => ({chargeId, quantity})))} className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Confirm & Release</button>
                </div>
            </div>
        </div>
    );
}


const Shipments: React.FC<ShipmentsProps> = ({ shipments, racks, addShipment, releaseShipment, assignShipmentToRack, getInvoice, chargeSettings, fetchChargeSettings, customFields, fetchCustomFields, showToast }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [shipmentToRelease, setShipmentToRelease] = useState<Shipment | null>(null);
  const [shipmentToAssign, setShipmentToAssign] = useState<Shipment | null>(null);
  const [shipmentToPrint, setShipmentToPrint] = useState<Shipment | null>(null);
  const [invoiceToShow, setInvoiceToShow] = useState<Invoice | null>(null);
  const initialFormState = { shipper: '', consignee: '', weight: '', pieces: '', commodity: '', dimensions: '', notes: '', expectedDate: '' };
  const [formData, setFormData] = useState(initialFormState);
  const [customFieldData, setCustomFieldData] = useState<Record<number, string | number>>({});
  
  useEffect(() => { 
      if (user?.role === 'Admin') {
        fetchChargeSettings();
        fetchCustomFields();
      }
  }, [user, fetchChargeSettings, fetchCustomFields]);

  const hasAccess = (requiredRoles: UserRole[]) => user && requiredRoles.includes(user.role);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newShipmentData = {
        shipper: formData.shipper, consignee: formData.consignee,
        weight: parseFloat(formData.weight), pieces: parseInt(formData.pieces, 10),
        commodity: formData.commodity, dimensions: formData.dimensions,
        notes: formData.notes, expectedDate: formData.expectedDate,
        customFields: customFieldData
    };
    try {
        const createdShipment = await addShipment(newShipmentData);
        setFormData(initialFormState);
        setCustomFieldData({});
        setShipmentToPrint(createdShipment);
        setActiveTab('all');
        showToast(`Shipment ${createdShipment.id} created successfully.`, 'success');
    } catch(error: any) { showToast(error.message, 'error'); }
  };
  
  const handleConfirmRelease = async (charges: { chargeId: number, quantity: number }[]) => {
      if (!shipmentToRelease) return;
      try {
        await releaseShipment(shipmentToRelease.id, charges);
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

  const renderCustomFields = () => customFields.map(field => {
      const inputType = field.type === 'Number' ? 'number' : field.type === 'Date' ? 'date' : 'text';
      return (
          <div key={field.id}>
              <label className="text-gray-700 dark:text-gray-200">{field.label}</label>
              <input type={inputType} name={`custom_${field.id}`}
                  value={customFieldData[field.id] || ''}
                  onChange={e => setCustomFieldData(prev => ({...prev, [field.id]: e.target.value}))}
                  className="mt-2 block w-full px-4 py-2 text-gray-700 bg-white border rounded-md dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-primary-400 focus:ring-opacity-40 focus:ring-primary-300" 
              />
          </div>
      );
  });

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Shipment Management</h2>
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setActiveTab('all')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'all' ? 'border-b-2 border-primary-500 text-primary-500' : 'text-gray-500'}`}>Active Shipments</button>
        <button onClick={() => setActiveTab('released')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'released' ? 'border-b-2 border-primary-500 text-primary-500' : 'text-gray-500'}`}>Released</button>
        {hasAccess([UserRole.Admin, UserRole.Worker]) && <button onClick={() => setActiveTab('add')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'add' ? 'border-b-2 border-primary-500 text-primary-500' : 'text-gray-500'}`}>Add New Shipment</button>}
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
                        <button onClick={() => setSelectedShipment(shipment)} className="text-primary-600 hover:text-indigo-900 mr-4">Details</button>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 max-w-2xl mx-auto">
            <form onSubmit={handleSubmit}>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type="text" name="shipper" value={formData.shipper} onChange={e => setFormData({...formData, shipper: e.target.value})} placeholder="Shipper" className="block w-full px-4 py-2 text-gray-700 bg-white border rounded-md dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-primary-400" required />
                    <input type="text" name="consignee" value={formData.consignee} onChange={e => setFormData({...formData, consignee: e.target.value})} placeholder="Consignee" className="block w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-gray-300" required />
                    <input type="number" name="weight" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} placeholder="Weight (kg)" className="block w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-gray-300" required />
                    <input type="number" name="pieces" value={formData.pieces} onChange={e => setFormData({...formData, pieces: e.target.value})} placeholder="Pieces" className="block w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-gray-300" required />
                    <input type="text" name="commodity" value={formData.commodity} onChange={e => setFormData({...formData, commodity: e.target.value})} placeholder="Commodity" className="block w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-gray-300"/>
                    <input type="text" name="dimensions" value={formData.dimensions} onChange={e => setFormData({...formData, dimensions: e.target.value})} placeholder="Dimensions (e.g. 10x20x30 cm)" className="block w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-gray-300"/>
                    <div className="md:col-span-2">
                        <label className="text-gray-700 dark:text-gray-200">Expected Arrival Date</label>
                        <input type="date" name="expectedDate" value={formData.expectedDate} onChange={e => setFormData({...formData, expectedDate: e.target.value})} className="mt-2 block w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-gray-300"/>
                    </div>
                    <textarea name="notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Notes" className="md:col-span-2 block w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:text-gray-300"></textarea>
                    {renderCustomFields()}
                </div>
              <div className="mt-6 flex items-center justify-end">
                <button type="submit" className="px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-primary-600 rounded-md hover:bg-primary-700">Add Shipment</button>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-4">Shipment {selectedShipment.id}</h3>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
                <p><strong>Shipper:</strong> {selectedShipment.shipper}</p>
                <p><strong>Consignee:</strong> {selectedShipment.consignee}</p>
                <p><strong>Weight:</strong> {selectedShipment.weight} kg, <strong>Pieces:</strong> {selectedShipment.pieces}</p>
                <p><strong>Commodity:</strong> {selectedShipment.commodity || 'N/A'}</p>
                <p><strong>Dimensions:</strong> {selectedShipment.dimensions || 'N/A'}</p>
                <p><strong>Arrival:</strong> {new Date(selectedShipment.arrivalDate).toLocaleString()}</p>
                <p><strong>Expected:</strong> {selectedShipment.expectedDate ? new Date(selectedShipment.expectedDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Status:</strong> {selectedShipment.status}, <strong>Rack:</strong> {selectedShipment.rackId || 'N/A'}</p>
                {selectedShipment.notes && <p className="pt-2 border-t mt-2"><strong>Notes:</strong> {selectedShipment.notes}</p>}
                {Object.entries(selectedShipment.customFields).length > 0 && (
                    <div className="pt-2 border-t mt-2">
                        <h4 className="font-semibold">Additional Info:</h4>
                        {Object.entries(selectedShipment.customFields).map(([label, value]) => <p key={label}><strong>{label}:</strong> {value}</p>)}
                    </div>
                )}
            </div>
            <div className="mt-6 space-y-2">
                {selectedShipment.status === ShipmentStatus.Intake && hasAccess([UserRole.Admin, UserRole.Supervisor]) && (
                    <button onClick={() => setShipmentToAssign(selectedShipment)} className="w-full px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-green-600 rounded-md hover:bg-green-700">
                        Assign to Rack
                    </button>
                )}
                 <button onClick={() => setShipmentToPrint(selectedShipment)} className="w-full px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-700">
                    Print Labels
                </button>
                <button onClick={() => setSelectedShipment(null)} className="w-full px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-gray-600 rounded-md hover:bg-gray-700">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shipments;