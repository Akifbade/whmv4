import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { Rack, RackStatus, UserRole } from '../types';
import { useWMSData } from '../hooks/useWMSData';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';

const RackCard: React.FC<{ rack: Rack }> = ({ rack }) => {
    const isOccupied = rack.status === RackStatus.Occupied;
    return (
        <div className={`rounded-lg p-4 shadow transition-all duration-300 ${
            isOccupied ? 'bg-red-200 dark:bg-red-900 border-red-400' : 'bg-green-200 dark:bg-green-900 border-green-400'
        } border-2`}>
            <div className="flex justify-between items-center">
                <span className="font-bold text-lg">{rack.slot}</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    isOccupied ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                }`}>{rack.status}</span>
            </div>
            <div className="mt-2 text-sm">
                <p>{rack.shipmentId || 'Empty'}</p>
            </div>
        </div>
    );
};

const Scanner: React.FC<{ onAssign: (shipmentId: string, rackId: string) => void }> = ({ onAssign }) => {
    const [scannedShipment, setScannedShipment] = useState<string | null>(null);
    const [scannedRack, setScannedRack] = useState<string | null>(null);
    const [message, setMessage] = useState('Scan Shipment QR Code...');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerContainerId = "qr-reader";

    useEffect(() => {
        const qrScanner = new Html5Qrcode(scannerContainerId);
        scannerRef.current = qrScanner;
        
        const startScanner = async () => {
            try {
                await qrScanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: 250 },
                    (decodedText) => {
                        try {
                            const data = JSON.parse(decodedText);
                            if (!scannedShipment && data.shipmentId) {
                                setScannedShipment(data.shipmentId);
                                setMessage(`Shipment ${data.shipmentId} scanned. Now scan Rack QR Code...`);
                            } else if (scannedShipment && data.rackId && !data.shipmentId) { // a rack QR
                                setScannedRack(data.rackId);
                                setMessage(`Rack ${data.rackId} scanned. Assigning...`);
                                onAssign(scannedShipment, data.rackId);
                                resetScanner();
                            }
                        } catch (e) {
                            // ignore non-json qr codes
                        }
                    },
                    (errorMessage) => { /* ignore */ }
                );
            } catch (err) {
                console.error("QR Scanner Error:", err);
                setMessage("Could not start scanner. Check camera permissions.");
            }
        };

        startScanner();

        return () => {
            if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current.stop().catch(err => console.error("Failed to stop scanner", err));
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const resetScanner = () => {
        setScannedShipment(null);
        setScannedRack(null);
        setTimeout(() => setMessage('Scan Shipment QR Code...'), 2000);
    };

    return (
        <div className="p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
            <div id={scannerContainerId} style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}></div>
            <p className="mt-4 text-center font-semibold text-blue-600 dark:text-blue-400">{message}</p>
        </div>
    );
};

const PrintRackQrModal: React.FC<{ racks: Rack[]; onClose: () => void }> = ({ racks, onClose }) => {
    const handlePrint = () => {
        const printContents = document.getElementById('printable-racks-area')?.innerHTML;
        const originalContents = document.body.innerHTML;
        if (printContents) {
            document.body.innerHTML = printContents;
            window.print();
            document.body.innerHTML = originalContents;
            window.location.reload();
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-4xl w-full max-h-[90vh] flex flex-col">
                <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Print Rack QR Labels</h3>
                <div id="printable-racks-area" className="overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-2">
                    {racks.map(rack => (
                        <div key={rack.id} className="flex flex-col items-center text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                            <div className="p-2 bg-white rounded-md">
                                <QRCode value={JSON.stringify({ rackId: rack.id })} size={128} />
                            </div>
                            <p className="mt-2 font-semibold text-gray-800 dark:text-gray-200">{rack.rackLine}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Slot: {rack.slot}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-4 border-t dark:border-gray-600 flex justify-end items-center space-x-4">
                    <button onClick={handlePrint} className="px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-green-600 rounded-md hover:bg-green-700 focus:outline-none">Print</button>
                    <button onClick={onClose} className="px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none">Close</button>
                </div>
            </div>
        </div>
    );
};


const Racks: React.FC<ReturnType<typeof useWMSData> & { currentUserRole: UserRole }> = ({ racks, assignShipmentToRack, currentUserRole }) => {
  const [showScanner, setShowScanner] = useState(false);
  const [showRackQrModal, setShowRackQrModal] = useState(false);
  
  const groupedRacks = racks.reduce((acc, rack) => {
    if (!acc[rack.rackLine]) {
      acc[rack.rackLine] = [];
    }
    acc[rack.rackLine].push(rack);
    return acc;
  }, {} as Record<string, Rack[]>);

  const handleAssignment = (shipmentId: string, rackId: string) => {
    assignShipmentToRack(shipmentId, rackId);
    setShowScanner(false);
    alert(`Successfully assigned Shipment ${shipmentId} to Rack ${rackId}`);
  };

  const canScan = currentUserRole === UserRole.Admin || currentUserRole === UserRole.Worker;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Rack Layout</h2>
        <div className="flex items-center space-x-4">
            {canScan && (
              <button onClick={() => setShowRackQrModal(true)} className="px-6 py-2 leading-5 text-gray-700 transition-colors duration-200 transform bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus:outline-none">
                Generate Rack QR Codes
              </button>
            )}
            {canScan && (
              <button onClick={() => setShowScanner(!showScanner)} className="px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none">
                {showScanner ? 'Close Scanner' : 'Open QR Scanner'}
              </button>
            )}
        </div>
      </div>

      {showScanner && <div className="mb-6"><Scanner onAssign={handleAssignment} /></div>}
      {showRackQrModal && <PrintRackQrModal racks={racks} onClose={() => setShowRackQrModal(false)} />}


      <div className="space-y-8">
        {Object.entries(groupedRacks).map(([rackLine, rackList]) => (
          <div key={rackLine} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">{rackLine}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {rackList.map(rack => (
                <RackCard key={rack.id} rack={rack} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Racks;