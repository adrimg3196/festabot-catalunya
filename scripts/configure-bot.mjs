const SECRET = process.env.PROGRAM_SYNC_SECRET;
const ENDPOINT = process.env.CONFIGURE_ENDPOINT || "https://festabot-catalunya.adrimg3196.workers.dev/internal/configure";

if (!SECRET) {
  console.error("PROGRAM_SYNC_SECRET is required");
  process.exit(1);
}

try {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET}` }
  });

  if (!response.ok) {
    console.error(`Bot configuration failed: ${response.status}`);
    process.exit(1);
  }

  console.log("Bot commands and webhook configured");
} catch (error) {
  console.error(`Bot configuration failed: ${String(error)}`);
  process.exit(1);
}
