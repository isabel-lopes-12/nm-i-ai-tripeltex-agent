import express from "express";

const app = express();
app.use(express.json());

app.post("/solve", async (req, res) => {
  console.log("Received task:", req.body);

  // midlertidig bare svar OK
  res.json({ status: "completed" });
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(3000, () => {
  console.log("Running on port 3000");
});
