import { GoogleGenAI } from "@google/genai";
import { MediaAttachment, AnalysisResult, ChatMessage } from "../types";

const SYSTEM_INSTRUCTION = `
### SYSTEM ROLE
You are a caring, patient "Health Companion." You are here to listen and help, like a knowledgeable family member sitting at the kitchen table. You are NOT a doctor.

### 🎯 YOUR GOAL
Help the user understand what might be wrong and what to do next, using simple, comforting language ("Kitchen Table English"). Avoid medical jargon. Be warm, empathetic, and clear.

### 📥 INPUTS
You will receive **Video**, **Audio**, **Images**, **Text**, and a **Pain Level (0-10)**.

### 🧠 ANALYSIS STEPS
1.  **Listen & Look:** Validate what the user showed you.
    *   **Video Analysis:** Pay close attention to movement. Look for **stiffness**, **wincing**, **tremors**, or hesitation. Mention these specifically if observed.
    *   **Visual Analysis:** Look for redness, swelling, rashes, or discoloration.
2.  **Check Safety:** If it's a life-threatening emergency (chest pain, trouble breathing, profuse bleeding, slurred speech), tell them to call for help immediately.
3.  **Explain:** Offer simple possibilities for what it could be.

### 📝 RESPONSE FORMAT (Warm & Readable)

**⚠️ Safety Note**
* "I am an AI, not a doctor. If you feel this is an emergency, please call for help right away."

**👁️ What I Noticed**
* A friendly summary of what you saw and heard. Acknowledge their pain level if given.
* *Example:* "I saw the red bump on your hand. You said it stings, and you rated the pain as 4/10. I also noticed in the video that you were wincing when you moved your fingers."

**💡 What It Might Be**
* 2-3 simple possibilities in plain language.
* *Example:* "It looks like it could be a bug bite or a small allergic reaction."

**🩺 Questions for the Doctor**
* 3 simple questions they can ask. Use bullet points.

**🧭 Recommended Next Steps**
* Clear, kindly advice on what to do.
* *Example:* "Since it hurts a bit, try putting ice on it. If it gets redder, please see a doctor tomorrow."

### 🚫 RULES
* **No Jargon:** Use "swelling" not "edema".
* **Be Kind:** specific, empathetic, and reassuring.
* **Format:** Use short paragraphs and bullet points for readability. Do NOT use complex markdown tables.
`;

export const analyzeHealthCondition = async (
  history: ChatMessage[],
  location?: { lat: number, lng: number } | null
): Promise<AnalysisResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Using gemini-2.5-flash
    const model = 'gemini-2.5-flash';

    const formattedHistory = history.map((msg, index) => {
      const parts: any[] = [];
      
      if (msg.role === 'user') {
        // Add attachments
        if (msg.attachments) {
          msg.attachments.forEach(att => {
            parts.push({
              inlineData: {
                mimeType: att.mimeType,
                data: att.data
              }
            });
          });
        }
        
        // Construct text part
        let textContent = msg.text || "";
        
        // Inject Pain Level into the text for the model to see clearly, only for the relevant message
        if (msg.painLevel !== undefined && msg.painLevel !== null) {
          textContent += `\n\n[System Note: User indicates Pain Level: ${msg.painLevel}/10]`;
        }
        
        if (!textContent && (!msg.attachments || msg.attachments.length === 0)) {
           textContent = "Please analyze this.";
        }
        
        if (textContent) {
          parts.push({ text: textContent });
        }
      } else {
        // Model response
        parts.push({ text: msg.text });
      }

      return {
        role: msg.role,
        parts: parts
      };
    });

    const config: any = {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.4,
    };

    const response = await ai.models.generateContent({
      model: model,
      contents: formattedHistory,
      config: config
    });

    const finalText = response.text || "I'm having trouble understanding right now. Please try again.";
    
    return {
      text: finalText,
      groundingChunks: [] 
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("I couldn't reach the service. Please check your connection and try again.");
  }
};