import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("No API key found.");
        return;
    }
    const genAI = new GoogleGenerativeAI(key);
    try {
        // There isn't a direct listModels in the simple SDK usually, 
        // but we can try common ones or use the rest API
        const commonModels = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "gemini-1.0-pro"];
        for (const m of commonModels) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                await model.generateContent("ping");
                console.log(`✅ [OK]: ${m}`);
            } catch (e: any) {
                console.log(`❌ [FAIL]: ${m} - ${e.message}`);
            }
        }
    } catch (e: any) {
        console.error("List Error:", e.message);
    }
}

listModels();
