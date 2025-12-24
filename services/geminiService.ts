import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ContactData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const contactSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    meetWhen: { type: Type.STRING, description: "When the meeting happened or context of meeting if available" },
    firstName: { type: Type.STRING },
    lastName: { type: Type.STRING },
    title: { type: Type.STRING },
    company: { type: Type.STRING },
    school: { type: Type.STRING, description: "University or Business School name (e.g. Wharton, HBS)" },
    industry: { type: Type.STRING, description: "Inferred industry based on company or title" },
    currentResident: { type: Type.STRING, description: "City or location derived from profile" },
    nationality: { type: Type.STRING },
    ageRange: { type: Type.STRING, description: "Estimated age range (e.g. 25-30)" },
    birthday: { type: Type.STRING },
    email: { type: Type.STRING },
    phone: { type: Type.STRING },
    link: { type: Type.STRING, description: "URL found on card or implied LinkedIn URL" },
    firstImpression: { type: Type.STRING, description: "Adjectives describing the person based on photo or bio tone" },
    importance: { type: Type.STRING },
    contactFrequency: { type: Type.STRING },
    lastContact: { type: Type.STRING },
    lastContactNotes: { type: Type.STRING },
    notes: { type: Type.STRING, description: "Summary of skills or bio" },
    // nextContactDue is calculated, we don't ask AI for it typically, but if it returns it we might ignore it in favor of calculation
  },
  required: ["firstName", "lastName"],
};

interface ProcessInputParams {
  imagesBase64?: string[]; // Changed from single string to array
  audioBase64?: string | null;
  currentData?: ContactData;
}

export const processContactInfo = async ({ imagesBase64 = [], audioBase64, currentData }: ProcessInputParams): Promise<ContactData> => {
  try {
    const parts: any[] = [];

    // Helper to process base64 string
    const getBase64Data = (str: string) => str.includes(',') ? str.split(',')[1] : str;
    const getMimeType = (str: string, defaultType: string) => {
        const match = str.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
        return match ? match[1] : defaultType;
    };

    if (imagesBase64 && imagesBase64.length > 0) {
      imagesBase64.forEach(img => {
        parts.push({
          inlineData: {
            mimeType: getMimeType(img, 'image/jpeg'),
            data: getBase64Data(img)
          }
        });
      });
    }

    if (audioBase64) {
      parts.push({
        inlineData: {
          mimeType: getMimeType(audioBase64, 'audio/webm'),
          data: getBase64Data(audioBase64)
        }
      });
    }

    let promptText = "Extract contact information and map it to the fields.";
    
    if (currentData) {
      promptText += `\n\nExisting Data JSON: ${JSON.stringify(currentData)}`;
      promptText += "\nUpdate the existing data with the provided input. Merge information intelligently. If the input contradicts the existing data, trust the new input.";
    } else {
      promptText += "\nIf a field is not present, leave it as an empty string.";
    }

    promptText += "\nFor 'meetWhen', try to infer the date or context.";
    promptText += "\nFor 'notes', summarize the bio, skills, or spoken context.";
    promptText += "\nFor 'ageRange', DO NOT GUESS based on appearance. Only fill this if explicit age information is available. Otherwise leave EMPTY.";
    promptText += "\nFor 'school', extract university or business school (e.g. Wharton, HBS) if visible.";
    promptText += "\nFor 'firstImpression', ONLY fill this if explicitly stated or strongly implied by specific visual cues. If unsure or generic, leave EMPTY. Do NOT use terms like 'Professional', 'Educated', or 'Smart' unless explicitly evidence exists.";
    promptText += "\nDo NOT extract Graduation Year.";
    promptText += "\nDo NOT set nextContactDue, this is calculated automatically.";
    promptText += "\nIf audio is provided, transribe relevant details into the fields (e.g. 'This is John from Acme' -> firstName: John, company: Acme).";

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: contactSchema
      }
    });

    if (response.text) {
      const parsed = JSON.parse(response.text) as ContactData;
      return { ...(currentData || {}), ...parsed } as ContactData;
    }
    throw new Error("No data extracted");
  } catch (error) {
    console.error("Gemini Processing Failed:", error);
    throw error;
  }
};