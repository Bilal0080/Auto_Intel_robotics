
import { GoogleGenAI, Type } from "@google/genai";
import { CHAPTERS } from "../constants";

// Removed global initialization to ensure each call uses fresh environment config if needed.

export async function askRoboticsExpert(question: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: question,
      config: {
        systemInstruction: `You are a world-class expert at AutoIntel Robotics. 
        Your goal is to provide deep technical insights into humanoid robotics, mechanical engineering, and AI control. 
        AutoIntel's mission is "Where Machines Learn". Keep responses professional, instructional, and concise.`,
        temperature: 0.7,
        topP: 0.95,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm having trouble connecting to my central processing unit. Please try again later.";
  }
}

// Fix: Modified to return grounding chunks to comply with Google Search grounding requirements.
export async function searchRobonexusContent(query: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        systemInstruction: "You are the AutoIntel Robotics Knowledge Base. Search and provide detailed technical answers about humanoid robotics.",
        tools: [{ googleSearch: {} }],
      },
    });
    return {
      text: response.text,
      groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks
    };
  } catch (error) {
    console.error("Search API Error:", error);
    return { text: "The knowledge base is currently unreachable." };
  }
}

export async function analyzeTelemetryHealth(telemetry: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Component Telemetry: "${telemetry}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            healthScore: { type: Type.NUMBER, description: "Health score from 0-100" },
            state: { type: Type.STRING, description: "One word status: Nominal, Throttling, Degraded, Failed" },
            briefAnalysis: { type: Type.STRING, description: "10-word technical summary of functionality." },
            nextCalibration: { type: Type.STRING, description: "Estimated time to next required maintenance." }
          },
          required: ["healthScore", "state", "briefAnalysis", "nextCalibration"]
        },
        systemInstruction: "You are the AutoIntel System Health Engine. Analyze the raw sensor readings for a specific humanoid component and return its operational health status in JSON.",
        temperature: 0.1,
      },
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    return { healthScore: 50, state: "Unknown", briefAnalysis: "Analysis engine offline.", nextCalibration: "Immediate" };
  }
}

export async function resolveRoboticsError(errorLog: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Diagnostic Request: Analyze and find the exact source of failure for: "${errorLog}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subsystem: {
              type: Type.STRING,
              description: "The specific hardware/software subsystem affected. Must be one of: Head, Torso, Arm_L, Arm_R, Leg_L, Leg_R, General.",
            },
            analysis: {
              type: Type.STRING,
              description: "Detailed technical analysis of the error.",
            },
            hotfix: {
              type: Type.STRING,
              description: "Immediate temporary solution.",
            },
            permanentFix: {
              type: Type.STRING,
              description: "Long-term architectural resolution.",
            }
          },
          required: ["subsystem", "analysis", "hotfix", "permanentFix"]
        },
        systemInstruction: `You are the AutoIntel Robotics Senior Diagnostic Lead. 
        Your mission is to find the EXACT source of error in a humanoid system.
        Analyze the telemetry or log provided and pinpoint which physical or logical subsystem is failing.
        Subsystems: Head (sensors/compute), Torso (power/main bus), Arm_L/R (manipulators/actuators), Leg_L/R (gait/servos).`,
        temperature: 0.2,
      },
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Diagnostic API Error:", error);
    return {
      subsystem: "General",
      analysis: "Critical diagnostic failure. The system could not isolate the source.",
      hotfix: "Reboot main controller.",
      permanentFix: "Verify diagnostic sensor calibration."
    };
  }
}

export async function analyzeRoboticCommand(command: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Robotic Command/Code: \n\`\`\`\n${command}\n\`\`\``,
      config: {
        systemInstruction: `You are the AutoIntel Robotics Command Architect. 
        Analyze the provided robotic code/command string for:
        1. **Syntax Integrity** (ROS2, Python, C++)
        2. **Logic Vulnerabilities** (Kinematic singularities, thermal spikes)
        3. **Optimized Alternative** (Corrected version)
        4. **Error Prediction**
        Be precise, technical, and helpful.`,
        temperature: 0.2,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Command Analysis Error:", error);
    return "Neural parser failed to decode command structure.";
  }
}

export async function optimizeEnergy(telemetry: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Current Telemetry: ${telemetry}`,
      config: {
        systemInstruction: `You are the AutoIntel Energy Architect. 
        Analyze telemetry and suggest:
        1. Duty Cycle Adjustments
        2. Compute Scaling
        3. Predicted Uptime Extension
        Focus on industrial-grade humanoid efficiency.`,
        temperature: 0.2,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Energy Optimizer Error:", error);
    return "Could not compute energy optimization at this time.";
  }
}
