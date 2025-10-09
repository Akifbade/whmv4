
import { GoogleGenAI, Type } from "@google/genai";
import { Rack, RackStatus } from "../types";

// Fix: Initialize GoogleGenAI with process.env.API_KEY directly as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ShipmentInfo {
    shipper: string;
    consignee: string;
    weight: number;
    pieces: number;
}

interface RackSuggestion {
    rackLine: string;
    slot: string;
    reason: string;
}

export const suggestRackPlacement = async (
  shipmentInfo: ShipmentInfo,
  racks: Rack[]
): Promise<RackSuggestion> => {
  // Fix: Removed API_KEY availability check to align with guideline assumptions.
  const availableRacks = racks.filter(r => r.status === RackStatus.Free)
    .map(r => ({ line: r.rackLine, slot: r.slot }));

  const prompt = `
    Based on the following new shipment and the list of available warehouse racks, suggest the best rack placement.
    Prioritize placing heavier items on lower slots if possible (e.g., slots ending in 1 or 2).
    
    Shipment Information:
    - Shipper: ${shipmentInfo.shipper}
    - Consignee: ${shipmentInfo.consignee}
    - Weight: ${shipmentInfo.weight} kg
    - Pieces: ${shipmentInfo.pieces}

    Available Racks (line, slot):
    ${JSON.stringify(availableRacks, null, 2)}

    Please provide your suggestion in JSON format.
  `;
  
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      rackLine: { type: Type.STRING, description: 'The suggested rack line, e.g., "Rack Line 1"' },
      slot: { type: Type.STRING, description: 'The suggested slot, e.g., "A1"' },
      reason: { type: Type.STRING, description: 'A brief reason for the suggestion.' }
    },
    required: ["rackLine", "slot", "reason"]
  };

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText) as RackSuggestion;
    return result;
  } catch(error) {
    console.error("Error calling Gemini API:", error);
    // Provide a fallback if API fails
    const fallbackRack = racks.find(r => r.status === RackStatus.Free);
    if(fallbackRack) {
        return { rackLine: fallbackRack.rackLine, slot: fallbackRack.slot, reason: 'Gemini API failed. This is a fallback suggestion.'};
    }
    throw new Error("Gemini API call failed and no available racks for fallback.");
  }
};
