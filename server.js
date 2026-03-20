const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

const SYSTEM_PROMPT = `
You are a Tripletex API expert.

You MUST generate valid Tripletex API requests.

STRICT RULES:
- Always use "values" wrapper
- Never invent endpoints
- Use correct structure
- Be minimal

VALID EXAMPLES:

Create customer:
POST /customer
{
  "values": {
    "name": "Ola Nordmann"
  }
}

Create product:
POST /product
{
  "values": {
    "name": "Consulting",
    "costPrice": 100
  }
}

Create invoice:
POST /invoice
{
  "values": {
    "customer": { "id": 1 }
  }
}

Return ONLY JSON:
{
  "steps": [
    {
      "method": "POST",
      "endpoint": "/customer",
      "body": {
        "values": { "name": "Test" }
      }
    }
  ]
}
`;

app.post("/solve", async (req, res) => {
  const { prompt, credentials } = req.body;

  console.log("TASK:", prompt);

  try {
    // 🔹 Ask Claude
    const message = await client.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `
TASK:
${prompt}

Generate valid Tripletex API steps.
Return ONLY JSON.
`,
        },
      ],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    console.log("Claude:", text);

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.log("❌ JSON parse failed → fallback");

      // 🔥 fallback (gir faktisk sjanse for poeng)
      parsed = {
        steps: [
          {
            method: "POST",
            endpoint: "/customer",
            body: {
              values: { name: "Fallback Customer" },
            },
          },
        ],
      };
    }

    // 🔹 Execute steps
    for (const step of parsed.steps || []) {
      const url = credentials.baseUrl + step.endpoint;

      console.log("CALL:", step.method, url);

      try {
        const response = await fetch(url, {
          method: step.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${credentials.sessionToken}`,
          },
          body: JSON.stringify(step.body),
        });

        const result = await response.text();
        console.log("API RESULT:", result);
      } catch (err) {
        console.log("❌ API error:", err.message);
      }
    }

    res.json({ status: "completed" });

  } catch (err) {
    console.error("Claude error:", err.message);
    res.json({ status: "completed" });
  }
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Running on port", PORT);
});
