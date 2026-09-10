import api from "./api";

// Simulates OCR processing delay + extraction result.
// Swap the body of scanPrescription() for a real api.post("/ocr/scan/", formData)
// once the backend OCR endpoint exists.
const ocrService = {
  scanPrescription: async (file) => {
    await new Promise((resolve) => setTimeout(resolve, 2200)); // simulate processing time

    // Randomly simulate an occasional OCR failure for error-handling testing
    if (Math.random() < 0.08) {
      throw new Error("Could not read the prescription clearly. Please try a clearer photo.");
    }

    return {
      data: {
        rawText:
          "Dr. R. Sharma, MD\nRx\nMetformin 500mg - Take twice daily\nAmlodipine 5mg - Take once daily, morning\nQty: 60 tablets each\nRefill: 2 times",
        extractedMedicines: [
          { name: "Metformin", dosage: "500mg", frequency: "Twice daily", quantity: 60 },
          { name: "Amlodipine", dosage: "5mg", frequency: "Once daily", quantity: 60 },
        ],
      },
    };
  },

  saveMedicines: async (medicines) => {
    // Once medications backend is live: return api.post("/medications/bulk-create/", { medicines });
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { data: { saved: medicines.length } };
  },
};

export default ocrService;



