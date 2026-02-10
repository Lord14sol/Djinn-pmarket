/**
 * Cerberus LLM Layer
 * Handles AI queries via Google Gemini for market verification
 */

import { LLMVerdict } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.LLM_API_KEY || process.env.GEMINI_API_KEY || '');
const flashModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const proModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

export async function queryLLM(input: string, mode: string, context: any[]): Promise<LLMVerdict> {
    const model = mode === "ORACLE_QUALITY_CHECK" ? proModel : flashModel;
    let prompt = "";

    if (mode === "HUNTER_TEXT_SEARCH") {
        prompt = `
        You are DOG 2: THE HUNTER. Your mission is to find EXPLICIT dates in the provided text.

        Rules:
        1. DO NOT INFER. If it says "next month", ignore it.
        2. ONLY extract dates written as DD/MM/YYYY, or "December 25, 2025", etc.
        3. If you find a date, return it in the "risk_flags" array prefixed with "DATE:".

        Text Content: ${JSON.stringify(context)}

        Return ONLY a JSON object:
        {
          "is_verifiable": boolean,
          "confidence_score": number,
          "risk_flags": ["DATE:YYYY-MM-DD", ...],
          "reasoning_summary": "string"
        }
        `;
    } else if (mode === "ORACLE_QUALITY_CHECK") {
        prompt = `
        You are DOG 3: THE ORACLE. Your mission is to evaluate if a prediction market is high quality and resolvable.

        Market: "${input}"
        Context: ${JSON.stringify(context)}

        Rules:
        1. Assign a "confidence_score" (0-100) based on AUTHORITY and CLARITY.
        2. Score < 90 if the source is weak, the question is ambiguous, or it's a scam.
        3. Score >= 90 ONLY if the market is professional and perfectly resolvable.

        [MEMORIA HISTORICA]:
        Si encuentras una regla en el contexto que aplique al mercado actual, TIENES LA OBLIGACION de seguirla para determinar la fecha o la validez, ignorando tu duda inicial.

        Return ONLY a JSON object:
        {
          "is_verifiable": boolean,
          "confidence_score": number,
          "risk_flags": string[],
          "reasoning_summary": "string"
        }
        `;
    } else {
        // INTERACTION_PROTOCOL or Default
        prompt = `
        You are Cerberus, the 3-Headed Guardian of Djinn.
        Respond to this message: "${input}"
        Context: ${JSON.stringify(context)}

        Style: Mythological, Cybernetic, Authoritative but helpful.

        Return ONLY a JSON object:
        {
          "is_verifiable": true,
          "confidence_score": 100,
          "risk_flags": [],
          "reasoning_summary": "Your persona-driven response here"
        }
        `;
    }

    try {
        console.log(`[LLM] Querying Gemini [${mode}]...`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean markdown if AI includes it
        const cleanJson = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanJson) as LLMVerdict;
    } catch (error: any) {
        console.error('[LLM] Gemini Query failed:', error.message || error);
        return {
            is_verifiable: false,
            confidence_score: 0,
            risk_flags: ["ai_layer_failure"],
            reasoning_summary: "The Oracle is currently blinded by cosmic interference (API Error)."
        };
    }
}
