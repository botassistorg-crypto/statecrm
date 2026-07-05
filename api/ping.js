const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyeqU4ymdxnzjobWfzWiVIaVb8zZtKgn5JIx-PF6oW6rWeZh4XocpmaQKOiMMCumJ8zPA/exec";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { licenseKey } = req.body;

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "UPDATE_LAST_ACTIVE",
        licenseKey: licenseKey
      }),
      redirect: "follow"
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "API_ERROR: " + error.message
    });
  }
}
