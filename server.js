const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");

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

  console.log("Incoming request:");
  console.log("  prompt:", prompt);
  console.log("  baseUrl:", credentials?.baseUrl);
  console.log("  sessionToken:", credentials?.sessionToken ? "[provided]" : "[missing]");

  try {
    const message = await client.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `
You must execute this accounting task.

TASK:
${prompt}

CREDENTIALS:
baseUrl: ${credentials?.baseUrl}
sessionToken: ${credentials?.sessionToken}

Rules:
- Do NOT ask questions
- Do NOT ask for credentials
- Do NOT explain anything
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
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    console.log("Claude raw response:", responseText);

    let parsed;
    try {
      parsed = JSON.parse(responseText);
      console.log("Parsed JSON:", parsed);
    } catch (e) {
      console.log("Could not parse JSON, returning raw text");
    }

    res.json({
      status: "completed",
      claude_output: parsed || responseText,
    });
  } catch (error) {
    console.error("Error calling Claude API:", error.message);
    res.status(500).json({ status: "error", error: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
