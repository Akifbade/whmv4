import React, { useState, useEffect, useRef, FormEvent } from 'react';
import QRCode from 'react-qr-code';
import { Rack, RackStatus, UserRole, Shipment } from '../types';
import { useWMSData } from '../hooks/useWMSData';
import { useAuth } from '../App';
import { Html5Qrcode } from 'html5-qrcode';

interface RacksProps extends ReturnType<typeof useWMSData> {
  showToast: (message: string, type: 'success' | 'error') => void;
}

const RackCard: React.FC<{ rack: Rack; shipments: Shipment[] }> = ({ rack, shipments }) => {
    const containedShipments = shipments.filter(s => s.rackId === rack.id);
    const getStatusStyles = () => {
        switch (rack.status) {
            case RackStatus.Free: return 'bg-green-200 dark:bg-green-900 border-green-400';
            case RackStatus.Partial: return 'bg-orange-200 dark:bg-orange-900 border-orange-400';
            case RackStatus.Full: return 'bg-red-200 dark:bg-red-900 border-red-400';
            default: return 'bg-gray-200 dark:bg-gray-700 border-gray-400';
        }
    };
    return (
        <div className={`rounded-lg p-4 shadow transition-all duration-300 ${getStatusStyles()} border-2 flex flex-col`}>
            <div className="flex justify-between items-center"><span className="font-bold text-lg">{rack.slot}</span><span className="font-bold text-lg">{rack.currentLoad} / {rack.capacity}</span></div>
            <div className="mt-2 text-sm text-gray-700 dark:text-gray-200 flex-grow">{containedShipments.length > 0 ? containedShipments.map(s => <div key={s.id}>{s.id} ({s.pieces} pcs)</div>) : 'Empty'}</div>
        </div>
    );
};

const Scanner: React.FC<{ onAssign: (shipmentId: string, rackId: string) => void, showToast: (message: string, type: 'success' | 'error') => void; }> = ({ onAssign, showToast }) => {
    const [scannedShipment, setScannedShipment] = useState<string | null>(null);
    const [message, setMessage] = useState('Scan Shipment QR Code...');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerContainerId = "qr-reader";

    useEffect(() => {
        const qrScanner = new Html5Qrcode(scannerContainerId);
        scannerRef.current = qrScanner;
        
        const startScanner = async () => {
            try {
                const cameras = await Html5Qrcode.getCameras();
                if (!cameras || cameras.length === 0) throw new Error("No cameras found.");
                await qrScanner.start( { facingMode: "environment" }, { fps: 10, qrbox: {width: 250, height: 250} },
                    (decodedText) => {
                        try {
                            const data = JSON.parse(decodedText);
                            if (!scannedShipment && data.shipmentId) {
                                setScannedShipment(data.shipmentId);
                                setMessage(`Shipment ${data.shipmentId} scanned. Now scan Rack QR Code...`);
                            } else if (scannedShipment && data.rackId && !data.shipmentId) {
                                setMessage(`Rack ${data.rackId} scanned. Assigning...`);
                                onAssign(scannedShipment, data.rackId);
                                setScannedShipment(null);
                                setTimeout(() => setMessage('Scan Shipment QR Code...'), 2000);
                            }
                        } catch (e) { /* ignore non-json */ }
                    },
                    (errorMessage) => { /* ignore */ }
                );
            } catch (err) {
                setMessage("Could not start scanner. Check camera permissions.");
                showToast("Could not start scanner. Check camera permissions.", 'error');
            }
        };
        startScanner();
        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.error("Failed to stop scanner", err));
            }
        };
    }, [scannedShipment, onAssign, showToast]);

    return (
        <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
            <div id={scannerContainerId} style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}></div>
            <p className="mt-4 text-center font-semibold text-primary-600 dark:text-primary-400">{message}</p>
        </div>
    );
};

const PrintRackQrModal: React.FC<{ racks: Rack[]; onClose: () => void }> = ({ racks, onClose }) => {
    const handlePrint = () => {
        const printContents = document.getElementById('printable-racks-area')?.innerHTML;
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
            printWindow?.document.write('<html><head><title>Print Rack Labels</title>');
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
                <h3 className="text-2xl font-bold mb-6">Print Rack QR Labels</h3>
                <div id="printable-racks-area" className="overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-2">
                    {racks.map(rack => (
                        <div key={rack.id} className="label-container flex flex-col items-center text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                            <div className="qr-wrapper p-2 bg-white rounded-md"><QRCode value={JSON.stringify({ rackId: rack.id })} size={128} /></div>
                            <p className="mt-2 font-semibold">{rack.rackLine}</p>
                            <p className="text-sm">Slot: {rack.slot}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-4 border-t flex justify-end space-x-4">
                    <button onClick={handlePrint} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Print</button>
                    <button onClick={onClose} className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Close</button>
                </div>
            </div>
        </div>
    );
};

const AddRackModal: React.FC<{ 
    addRack: (rack: { rackLine: string; slot: string; capacity: number }) => Promise<void>; 
    onClose: () => void;
    showToast: (message: string, type: 'success' | 'error') => void;
}> = ({ addRack, onClose, showToast }) => {
    const [formData, setFormData] = useState({ rackLine: '', slot: '', capacity: 1 });
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await addRack({ ...formData, capacity: Number(formData.capacity) });
            showToast(`Rack ${formData.rackLine}-${formData.slot} created.`, 'success');
            onClose();
        } catch (error: any) { showToast(error.message, 'error'); }
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
                <h3 className="text-2xl font-bold mb-6">Create New Rack</h3>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-6">
                        <input type="text" name="rackLine" value={formData.rackLine} onChange={handleInputChange} placeholder="Rack Line (e.g., A)" className="block w-full px-4 py-2 border rounded-md dark:bg-gray-700" required />
                        <input type="text" name="slot" value={formData.slot} onChange={handleInputChange} placeholder="Slot (e.g., 01)" className="block w-full px-4 py-2 border rounded-md dark:bg-gray-700" required />
                        <div>
                            <label htmlFor="capacity">Capacity</label>
                            <select name="capacity" id="capacity" value={formData.capacity} onChange={handleInputChange} className="block w-full px-4 py-2 mt-2 border rounded-md dark:bg-gray-700">
                                <option value={1}>1 Shipment</option><option value={2}>2 Shipments</option><option value={3}>3 Shipments</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-md">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">Create Rack</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Racks: React.FC<RacksProps> = ({ racks, shipments, addRack, assignShipmentToRack, showToast }) => {
  const { user } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [showRackQrModal, setShowRackQrModal] = useState(false);
  const [showAddRackModal, setShowAddRackModal] = useState(false);
  
  // FIX: The initial value for reduce must be typed to prevent TypeScript from inferring `rackList` as `unknown`.
  const groupedRacks = racks.reduce((acc, rack) => {
    (acc[rack.rackLine] = acc[rack.rackLine] || []).push(rack);
    return acc;
  }, {} as Record<string, Rack[]>);

  const handleAssignment = async (shipmentId: string, rackId: string) => {
    try {
        await assignShipmentToRack(shipmentId, rackId);
        showToast(`Assigned Shipment ${shipmentId} to Rack ${rackId}`, 'success');
    } catch(error: any) {
        showToast(error.message, 'error');
    }
  };

  const hasAccess = (requiredRoles: UserRole[]) => user && requiredRoles.includes(user.role);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Rack Layout</h2>
        <div className="flex items-center space-x-4">
            {hasAccess([UserRole.Admin, UserRole.Supervisor]) && <button onClick={() => setShowAddRackModal(true)} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Create New Rack</button>}
            {hasAccess([UserRole.Admin, UserRole.Supervisor]) && <button onClick={() => setShowRackQrModal(true)} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 rounded-md">Generate Rack QR Codes</button>}
            {hasAccess([UserRole.Admin, UserRole.Worker]) && <button onClick={() => setShowScanner(!showScanner)} className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700">{showScanner ? 'Close Scanner' : 'Open QR Scanner'}</button>}
        </div>
      </div>

      {showScanner && <div className="mb-6"><Scanner onAssign={handleAssignment} showToast={showToast} /></div>}
      {showRackQrModal && <PrintRackQrModal racks={racks} onClose={() => setShowRackQrModal(false)} />}
      {showAddRackModal && <AddRackModal addRack={addRack} onClose={() => setShowAddRackModal(false)} showToast={showToast} />}

      <div className="space-y-8">
        {Object.entries(groupedRacks).sort((a, b) => a[0].localeCompare(b[0])).map(([rackLine, rackList]) => (
          <div key={rackLine} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">{rackLine}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...rackList].sort((a,b) => a.slot.localeCompare(b.slot)).map(rack => (
                <RackCard key={rack.id} rack={rack} shipments={shipments} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Racks;