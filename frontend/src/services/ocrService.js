import api from "./api";

const ocrService = {
  scanPrescription: async (file) => {
    const formData = new FormData();
    formData.append("prescription", file);

    const response = await api.post("/ocr/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return {
      data: {
        rawText: response.data.raw_text || "",
        extractedMedicines: (response.data.medicines || []).map((medicine) => ({
          name: medicine.name || "",
          dosage: medicine.dosage || "",
          frequency: medicine.frequency || "Once daily",
          quantity: Number(medicine.quantity || 0),
          doses_per_day: Number(medicine.doses_per_day || 1),
        })),
      },
    };
  },

  saveMedicines: async (medicines) => {
    const response = await api.post("/ocr/save/", {
      medicines: medicines.map((medicine) => ({
        name: medicine.name || "",
        dosage: medicine.dosage || "",
        frequency: medicine.frequency || "Once daily",
        doses_per_day: Number(medicine.doses_per_day || 1),
        quantity: Number(medicine.quantity || 0),
      })),
    });

    return {
      data: response.data,
    };
  },
};

export default ocrService;