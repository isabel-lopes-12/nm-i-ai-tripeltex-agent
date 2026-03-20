const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const SYSTEM_PROMPT = `
You are an autonomous accounting agent.

You will NEVER ask for more information.
You will NEVER ask for credentials.

You are given everything you need.

Your job is to:
1. Understand the task
2. Plan the minimal API calls
3. Return structured JSON

Do NOT explain anything.
Return ONLY JSON.
`;

app.post("/solve", async (req, res) => {
  const { prompt, credentials } = req.body;

  console.log("Incoming task:", prompt);

  try {
    // 🔹 1. Ask Claude for plan
    const message = await client.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `
TASK:
${prompt}

CREDENTIALS:
baseUrl: ${credentials?.baseUrl}
sessionToken: ${credentials?.sessionToken}

Rules:
- Do NOT ask questions
- Return ONLY JSON

Output format:
{
  "steps": [
    {
      "method": "POST",
      "endpoint": "/example",
      "body": {}
    }
  ]
}
          `,
        },
      ],
    });

    const responseText = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    console.log("Claude raw:", responseText);

    // 🔹 2. Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (err) {
      console.error("Failed to parse JSON");
      return res.json({ status: "completed" });
    }

    // 🔹 3. Execute Tripletex API calls
    if (parsed?.steps) {
      for (const step of parsed.steps) {
        const url = credentials.baseUrl + step.endpoint;

        console.log("Calling:", step.method, url);

        try {
          const apiRes = await fetch(url, {
            method: step.method,
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${credentials.sessionToken}`,
            },
            body: step.body ? JSON.stringify(step.body) : undefined,
          });

          const result = await apiRes.text();
          console.log("API response:", result);
        } catch (err) {
          console.error("API call failed:", err.message);
        }
      }
    }

    // 🔹 4. Done
    res.json({ status: "completed" });

  } catch (error) {
    console.error("Claude error:", error.message);
    res.status(500).json({ status: "error" });
  }
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
