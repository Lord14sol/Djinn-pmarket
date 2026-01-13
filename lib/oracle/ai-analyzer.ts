import { Evidence, logOracleEvent } from './index';

// ============================================
// AI ANALYZER - GEMINI / OPENAI
// ============================================

export interface AnalysisRequest {
    marketTitle: string;
    marketDescription?: string;
    evidence: Evidence[];
    endDate?: string;
}

export interface AnalysisResult {
    suggestedOutcome: 'YES' | 'NO' | 'UNCERTAIN';
    confidence: number;
    reasoning: string;
    keyEvidence: string[];
}

interface AIConfig {
    provider: 'gemini' | 'openai';
    apiKey: string;
    model: string;
}

const SYSTEM_PROMPT = `You are an Oracle AI for a prediction market platform. Your job is to analyze evidence from multiple sources and determine if a market question has been resolved.

Given a market question and evidence, you must:
1. Analyze all evidence carefully
2. Determine if the outcome is clearly YES, clearly NO, or UNCERTAIN
3. Provide a confidence score (0-100)
4. Explain your reasoning
5. List the key pieces of evidence that support your conclusion

Be conservative - only suggest YES or NO if there is clear, verifiable evidence. If the evidence is mixed, ambiguous, or insufficient, respond with UNCERTAIN.

Respond ONLY in valid JSON format:
{
  "suggestedOutcome": "YES" | "NO" | "UNCERTAIN",
  "confidence": <number 0-100>,
  "reasoning": "<explanation>",
  "keyEvidence": ["<evidence 1>", "<evidence 2>"]
}`;

export async function analyzeMarket(
    request: AnalysisRequest,
    config: AIConfig
): Promise<AnalysisResult> {
    const userPrompt = buildPrompt(request);

    await logOracleEvent('analyze', `Analyzing market: ${request.marketTitle}`, config.provider);

    try {
        let result: AnalysisResult;

        if (config.provider === 'gemini') {
            result = await analyzeWithGemini(userPrompt, config.apiKey, config.model);
        } else {
            result = await analyzeWithOpenAI(userPrompt, config.apiKey, config.model);
        }

        await logOracleEvent('analyze',
            `Analysis complete: ${result.suggestedOutcome} (${result.confidence}% confidence)`,
            config.provider,
            { outcome: result.suggestedOutcome, confidence: result.confidence }
        );

        return result;
    } catch (error) {
        await logOracleEvent('error', `AI analysis failed: ${error}`, config.provider);
        throw error;
    }
}

function buildPrompt(request: AnalysisRequest): string {
    let prompt = `## Market Question\n${request.marketTitle}\n\n`;

    if (request.marketDescription) {
        prompt += `## Description\n${request.marketDescription}\n\n`;
    }

    if (request.endDate) {
        prompt += `## Resolution Date\n${request.endDate}\n\n`;
    }

    prompt += `## Evidence from Multiple Sources (${request.evidence.length} items)\n\n`;

    request.evidence.forEach((e, i) => {
        prompt += `### Evidence ${i + 1} [${e.source}]\n`;
        prompt += `**Title:** ${e.title}\n`;
        prompt += `**URL:** ${e.url}\n`;
        prompt += `**Content:** ${e.snippet}\n`;
        if (e.timestamp) prompt += `**Date:** ${e.timestamp}\n`;
        prompt += '\n';
    });

    prompt += `\nBased on this evidence, should the market resolve as YES, NO, or is it still UNCERTAIN? Analyze carefully and respond in JSON format.`;

    return prompt;
}

async function analyzeWithGemini(
    prompt: string,
    apiKey: string,
    model: string
): Promise<AnalysisResult> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [
                { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + prompt }] }
            ],
            generationConfig: {
                temperature: 0.2,
                topP: 0.8,
                maxOutputTokens: 1024,
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
        throw new Error('No response from Gemini');
    }

    return parseAIResponse(text);
}

async function analyzeWithOpenAI(
    prompt: string,
    apiKey: string,
    model: string
): Promise<AnalysisResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt },
            ],
            temperature: 0.2,
            max_tokens: 1024,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
        throw new Error('No response from OpenAI');
    }

    return parseAIResponse(text);
}

function parseAIResponse(text: string): AnalysisResult {
    // Extract JSON from possible markdown code blocks
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        throw new Error('Could not parse AI response as JSON');
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonStr);

    // Validate and normalize
    const outcome = String(parsed.suggestedOutcome).toUpperCase();
    if (!['YES', 'NO', 'UNCERTAIN'].includes(outcome)) {
        throw new Error(`Invalid outcome: ${outcome}`);
    }

    return {
        suggestedOutcome: outcome as 'YES' | 'NO' | 'UNCERTAIN',
        confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 50)),
        reasoning: String(parsed.reasoning || ''),
        keyEvidence: Array.isArray(parsed.keyEvidence) ? parsed.keyEvidence.map(String) : [],
    };
}
