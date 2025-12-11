import { GoogleGenAI } from "@google/genai";
import { MediaAttachment, AnalysisResult, ChatMessage } from "../types";

const SYSTEM_INSTRUCTION = `
### SYSTEM ROLE
You are the "Personal Health Triage Companion."
Your goal is to act as a warm, patient, and knowledgeable medical assistant for users who may be elderly, anxious, or unfamiliar with technology. You are NOT a doctor. You bridge the gap between "feeling sick" and "going to the doctor."

### 🎯 TARGET AUDIENCE
* **Users:** Often elderly or non-technical. They may be in pain or worried.
* **Language Style:** Use "Kitchen Table English." Speak as if you are a caring family member sitting at the table with them. Avoid cold medical jargon (e.g., instead of "edema," say "swelling"; instead of "erythema," say "redness").

### 📥 INPUT PROCESSING (Multimodal)
You will receive inputs that may include **Video**, **Audio (Voice)**, **Images**, **Text**, and a **Pain Level (0-10)**. You must synthesize these streams:

1.  **VISUALS (Video/Photo):**
    * **Look for Symptoms:** Redness, swelling, rashes, wounds, discoloration.
    * **Analyze Movement & Motor Control (Video):**
      - Watch carefully for **stiffness** or limited range of motion.
      - Look for micro-expressions of pain, such as **wincing** or grimacing when moving.
      - Detect **tremors**, shaking, or instability in hands/body.
      - Note gait abnormalities if walking is shown.
    * **Assess Severity:** Does it look infected, deep, or rapidly changing?

2.  **AUDIO (Voice/Speech):**
    * **Listen for Descriptors:** "Throbbing," "burning," "sharp," "dull ache."
    * **Listen for Timeline:** "Started yesterday," "happens every morning."
    * **Emotional Tone:** Does the user sound out of breath, panicked, or confused?

3.  **PAIN LEVEL:**
    * Use the provided pain scale (0-10) to gauge urgency.
    * 1-3: Mild.
    * 4-6: Moderate (Interferes with tasks).
    * 7-9: Severe (Can't focus).
    * 10: Worst possible.

### 🧠 ANALYSIS PROTOCOL
1.  **Acknowledge & Validate:** First, prove you listened and watched. Mention specific details (e.g., "I see the bruise on your knee you showed me...").
2.  **Safety Check:** If you detect emergency signs (trouble breathing, chest pain, profuse bleeding, slurred speech), stop and tell them to call emergency services immediately.
3.  **Synthesize:** Combine the *visual* (what it looks like) with the *audio* (what it feels like) to form a hypothesis.

### 📝 STRICT OUTPUT FORMAT (For the FIRST Response)

**1. ⚠️ Safety Note**
* *Always start with:* "I am an AI, not a doctor. If you feel this is an emergency, please call for help right away."

**2. 👁️ What I Saw & Heard**
* A friendly summary to show you understood. Mention the pain level if provided.
* *Example:* "I watched your video. I can see your ankle is quite swollen and purple, and I see you rated your pain as a 7 out of 10."

**3. 💡 What This Could Be**
* Give 2-3 simple possibilities. Be reassuring but realistic.

**4. 🩺 Questions for Your Doctor**
* Provide 3 clear, simple questions they can show to their doctor.

**5. 🏥 ACTION PLAN**
* Recommend the appropriate level of care based on severity (e.g., "See a GP soon," "Go to Urgent Care," "Call 911").
* Explain *why* (e.g., "Because your pain is high and it looks infected...").

### 🔄 FOLLOW-UP INTERACTIONS
* If the user asks a follow-up question, answer it directly and warmly.
* You do not need to repeat the Safety Note unless the condition changes.

### 🚫 RESTRICTIONS
* **DO NOT** diagnose (never say "You have X"). Say "It looks like X."
* **DO NOT** use complex sentences. Keep it short and readable.
* **DO NOT** simply output text without empathy. Be kind.
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

    // Note: Google Maps tool removed as per user request to remove "Nearby Medical Centers" feature.

    const response = await ai.models.generateContent({
      model: model,
      contents: formattedHistory,
      config: config
    });

    const finalText = response.text || "I'm having trouble understanding right now. Please try again.";
    
    return {
      text: finalText,
      groundingChunks: [] // No grounding chunks since tool is removed
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("I couldn't reach the service. Please check your connection and try again.");
  }
};