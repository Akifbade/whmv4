
import React, { useState, FormEvent } from 'react';
import QRCode from 'react-qr-code';
import { Shipment, UserRole, ShipmentStatus } from '../types';
import { suggestRackPlacement } from '../services/geminiService';
import { useWMSData } from '../hooks/useWMSData';

interface ShipmentsProps extends ReturnType<typeof useWMSData> {
  currentUserRole: UserRole;
  showToast: (message: string, type: 'success' | 'error') => void;
}

const PrintLabelsModal: React.FC<{ shipment: Shipment; onClose: () => void }> = ({ shipment, onClose }) => {
    const handlePrint = () => {
        const printContents = document.getElementById('printable-labels-area')?.innerHTML;
        const originalContents = document.body.innerHTML;
        if (printContents) {
            document.body.innerHTML = printContents;
            window.print();
            document.body.innerHTML = originalContents;
            window.location.reload(); // Reload to re-initialize React app state
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-4xl w-full max-h-[90vh] flex flex-col">
                <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Print Labels for Shipment {shipment.id}</h3>
                <div id="printable-labels-area" className="overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-2">
                    {Array.from({ length: shipment.pieces }).map((_, index) => (
                        <div key={index} className="flex flex-col items-center text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                            <div className="p-2 bg-white rounded-md">
                                <QRCode value={JSON.stringify({ shipmentId: shipment.id })} size={128} />
                            </div>
                            <p className="mt-2 font-semibold text-gray-800 dark:text-gray-200">{shipment.id}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Piece {index + 1} of {shipment.pieces}</p>
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

const Shipments: React.FC<ShipmentsProps> = (
    { shipments, racks, addShipment, releaseShipment, currentUserRole, showToast }
) => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [shipmentToPrint, setShipmentToPrint] = useState<Shipment | null>(null);
  const [showAllQrModal, setShowAllQrModal] = useState(false);
  const [formData, setFormData] = useState({ shipper: '', consignee: '', weight: '', pieces: '' });
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const newShipment = {
        shipper: formData.shipper,
        consignee: formData.consignee,
        weight: parseFloat(formData.weight),
        pieces: parseInt(formData.pieces, 10),
    };
    if (!(newShipment.shipper && newShipment.consignee && newShipment.weight > 0 && newShipment.pieces > 0)) {
        showToast("Please fill all fields with valid data.", 'error');
        return;
    }

    try {
        const createdShipment = await addShipment(newShipment);
        setFormData({ shipper: '', consignee: '', weight: '', pieces: '' });
        setSuggestion(null);
        setShipmentToPrint(createdShipment);
        setActiveTab('all');
        showToast(`Shipment ${createdShipment.id} created successfully.`, 'success');
    } catch(error: any) {
        showToast(error.message, 'error');
    }
  };
  
  const handleReleaseShipment = async (shipmentId: string) => {
      try {
        await releaseShipment(shipmentId);
        showToast(`Shipment ${shipmentId} released successfully.`, 'success');
      } catch (error: any) {
        showToast(error.message, 'error');
      }
  }

  const handleSuggestRack = async () => {
      setIsLoadingSuggestion(true);
      setSuggestion(null);
      try {
        const shipmentInfoForGemini = { ...formData, weight: parseFloat(formData.weight), pieces: parseInt(formData.pieces, 10) };
        const result = await suggestRackPlacement(shipmentInfoForGemini, racks);
        setSuggestion(`Gemini suggests: ${result.rackLine}, Slot ${result.slot}. Note: This is a suggestion, final placement is up to the operator.`);
      } catch (error) {
        console.error("Error fetching rack suggestion:", error);
        setSuggestion("Could not get a suggestion. Please assign manually.");
      } finally {
        setIsLoadingSuggestion(false);
      }
  };
  
  const canPerformAction = (action: 'add' | 'release') => {
      if(currentUserRole === UserRole.Admin) return true;
      if(action === 'add' && currentUserRole === UserRole.Worker) return true;
      if(action === 'release' && currentUserRole === UserRole.Supervisor) return true;
      return false;
  }

  const canGenerateQRs = currentUserRole === UserRole.Admin || currentUserRole === UserRole.Supervisor;
  const storedShipments = shipments.filter(shipment => shipment.status === ShipmentStatus.Stored);

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Shipment Management</h2>
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setActiveTab('all')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'all' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>All Shipments</button>
        {canPerformAction('add') && <button onClick={() => setActiveTab('add')} className={`px-4 py-2 text-lg font-medium ${activeTab === 'add' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}>Add New Shipment</button>}
        {canGenerateQRs && <button onClick={() => setShowAllQrModal(true)} className="px-4 py-2 text-lg font-medium text-gray-500 dark:text-gray-400 hover:text-blue-500">Generate Stored QR Codes</button>}
      </div>

      <div className="mt-6">
        {activeTab === 'all' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {['ID', 'Shipper', 'Consignee', 'Weight (kg)', 'Pieces', 'Status', 'Actions'].map(header => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {shipments.map(shipment => (
                  <tr key={shipment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{shipment.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{shipment.shipper}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{shipment.consignee}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{shipment.weight}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{shipment.pieces}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        shipment.status === ShipmentStatus.Stored ? 'bg-green-100 text-green-800' :
                        shipment.status === ShipmentStatus.Intake ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {shipment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button onClick={() => setSelectedShipment(shipment)} className="text-blue-600 hover:text-blue-900 mr-4">Details</button>
                      {canPerformAction('release') && shipment.status === ShipmentStatus.Stored && (
                        <button onClick={() => handleReleaseShipment(shipment.id)} className="text-indigo-600 hover:text-indigo-900">Release</button>
                      )}
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
              <div className="grid grid-cols-1 gap-6">
                <input type="text" name="shipper" value={formData.shipper} onChange={handleInputChange} placeholder="Shipper" className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-md dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:ring-blue-300 focus:ring-opacity-40 dark:focus:border-blue-300 focus:outline-none focus:ring" required />
                <input type="text" name="consignee" value={formData.consignee} onChange={handleInputChange} placeholder="Consignee" className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-md dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:ring-blue-300 focus:ring-opacity-40 dark:focus:border-blue-300 focus:outline-none focus:ring" required />
                <input type="number" name="weight" value={formData.weight} onChange={handleInputChange} placeholder="Weight (kg)" className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-md dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 focus:border-blue-400 focus:ring-blue-300 focus:ring-opacity-40 dark:focus:border-blue-300 focus:outline-none focus:ring" required />
                <input type="number" name="pieces" value={formData.pieces} onChange={handleInputChange} placeholder="Pieces" className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-md dark:bg-gray-800 dark:text-ray-300 dark:border-gray-600 focus:border-blue-400 focus:ring-blue-300 focus:ring-opacity-40 dark:focus:border-blue-300 focus:outline-none focus:ring" required />
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button type="submit" className="px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:bg-blue-700">Add Shipment</button>
                <button type="button" onClick={handleSuggestRack} disabled={isLoadingSuggestion || !formData.weight} className="px-6 py-2 leading-5 text-gray-700 transition-colors duration-200 transform bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 focus:outline-none disabled:opacity-50">
                    {isLoadingSuggestion ? 'Thinking...' : 'Suggest Rack with Gemini'}
                </button>
              </div>
              {suggestion && <p className="mt-4 text-sm text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-200 p-3 rounded-md">{suggestion}</p>}
            </form>
          </div>
        )}
      </div>

      {shipmentToPrint && <PrintLabelsModal shipment={shipmentToPrint} onClose={() => setShipmentToPrint(null)} />}

      {selectedShipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-4">Shipment {selectedShipment.id}</h3>
            <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <p><strong>Shipper:</strong> {selectedShipment.shipper}</p>
                <p><strong>Consignee:</strong> {selectedShipment.consignee}</p>
                <p><strong>Weight:</strong> {selectedShipment.weight} kg</p>
                <p><strong>Pieces:</strong> {selectedShipment.pieces}</p>
                <p><strong>Arrival:</strong> {new Date(selectedShipment.arrivalDate).toLocaleString()}</p>
                <p><strong>Status:</strong> {selectedShipment.status}</p>
                <p><strong>Rack:</strong> {selectedShipment.rackId || 'N/A'}</p>
                {selectedShipment.releaseDate && <p><strong>Released:</strong> {new Date(selectedShipment.releaseDate).toLocaleString()}</p>}
                {selectedShipment.charges && (
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md mt-4">
                        <h4 className="font-semibold">Charges</h4>
                        <p>Handling: ${selectedShipment.charges.handling.toFixed(2)}</p>
                        <p>Storage: ${selectedShipment.charges.storage.toFixed(2)}</p>
                        <p className="font-bold">Total: ${selectedShipment.charges.total.toFixed(2)}</p>
                    </div>
                )}
            </div>
            <div className="mt-6 p-4 bg-white rounded-md flex justify-center">
                 <QRCode value={JSON.stringify({shipmentId: selectedShipment.id, rackId: selectedShipment.rackId})} size={128} />
            </div>
            <button onClick={() => setSelectedShipment(null)} className="mt-6 w-full px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:bg-blue-700">Close</button>
          </div>
        </div>
      )}

      {showAllQrModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-4xl w-full max-h-[90vh] flex flex-col">
            <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">QR Codes for Stored Shipments</h3>
            {storedShipments.length > 0 ? (
              <div className="overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {storedShipments.map(shipment => (
                  <div key={shipment.id} className="flex flex-col items-center text-center p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="p-2 bg-white rounded-md">
                        <QRCode value={JSON.stringify({ shipmentId: shipment.id, rackId: shipment.rackId })} size={128} />
                    </div>
                    <p className="mt-2 font-semibold text-gray-800 dark:text-gray-200">ID: {shipment.id}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Rack: {shipment.rackId}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No shipments are currently in 'Stored' status.</p>
            )}
            <button onClick={() => setShowAllQrModal(false)} className="mt-6 w-full flex-shrink-0 px-6 py-2 leading-5 text-white transition-colors duration-200 transform bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:bg-blue-700">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shipments;
