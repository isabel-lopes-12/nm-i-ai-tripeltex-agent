const text = prompt.toLowerCase();

if (text.includes("kunde")) {
  await fetch(credentials.baseUrl + "/customer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credentials.sessionToken}`,
    },
    body: JSON.stringify({
      values: {
        name: "Test Kunde"
      }
    })
  });
}
