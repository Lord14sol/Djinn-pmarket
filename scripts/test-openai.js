// Simple test to verify the OpenAI API key works
const key = process.env.OPENAI_API_KEY || "YOUR_KEY_HERE";

async function testOpenAI() {
    console.log("Testing OpenAI API key...");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Say hello in one word" }],
            max_tokens: 10
        })
    });

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));
}

testOpenAI().catch(console.error);
