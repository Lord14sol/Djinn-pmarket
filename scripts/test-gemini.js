// Simple test to verify the Gemini API key works
const key = process.env.GEMINI_API_KEY || "YOUR_KEY_HERE";

async function testGemini() {
    console.log("Testing Gemini API key...");

    // Try different models
    const models = ["gemini-pro", "gemini-1.5-flash", "gemini-1.0-pro"];

    for (const model of models) {
        console.log(`\nTrying model: ${model}`);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: "Say hello in one word" }] }]
                })
            });

            const data = await response.json();
            console.log("Status:", response.status);

            if (response.ok) {
                console.log("SUCCESS! Model works:", model);
                console.log("Response:", data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data).substring(0, 200));
                return;
            } else {
                console.log("Error:", data.error?.message?.substring(0, 100) || "Unknown");
            }
        } catch (e) {
            console.log("Fetch Error:", e.message);
        }
    }
}

testGemini().catch(console.error);
