const axios = require("axios");

function splitMessage(text, maxLength = 2000) {
  const parts = [];
  while (text.length > maxLength) {
    parts.push(text.slice(0, maxLength));
    text = text.slice(maxLength);
  }
  if (text.length) parts.push(text);
  return parts;
}

module.exports = (client) => {

  if (!process.env.OPENROUTER_API_KEY) {
    console.log("❌ [Sistem AI] LIPSEȘTE OPENROUTER_API_KEY din .env");
  } else {
    console.log("✅ [Sistem AI] Cheia OpenRouter a fost detectată corect.");
  }

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if (process.env.CHANNEL_ID && message.channel.id !== process.env.CHANNEL_ID) return;

    // Verificăm dacă mesajul începe cu !ai, !AI, !Ai sau !aI (indiferent de majuscule)
    const prefixRegex = /^!ai/i;
    if (!prefixRegex.test(message.content)) return;

    // Extragem textul de după prefix (indiferent de lungimea acestuia)
    const userMessage = message.content.replace(prefixRegex, "").trim();
    if (!userMessage) return message.reply("Scrie ceva după !ai (Exemplu: `!ai salut`)");

    try {
      console.log(`📩 [AI Request] User: ${userMessage}`);

      await message.channel.sendTyping();

      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "google/gemini-2.5-flash", 
          messages: [
            { role: "system", content: "Ești un asistent prietenos integrat într-un server de Discord." },
            { role: "user", content: userMessage }
          ],
          max_tokens: 2000
        },
        {
          headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      const reply = response.data?.choices?.[0]?.message?.content;

      if (!reply) {
        return message.reply("Nu am primit un răspuns valid de la AI.");
      }

      const messages = splitMessage(reply);

      await message.reply(messages[0]);

      for (let i = 1; i < messages.length; i++) {
        await message.channel.send(messages[i]);
      }

    } catch (err) {
      console.error("❌ AI ERROR:", err?.response?.data || err.message);

      if (err?.response?.status === 401) {
        message.reply("❌ Eroare: API KEY-ul OpenRouter din fișierul `.env` este invalid.");
      } else if (err?.response?.status === 429) {
        message.reply("❌ Lipsă credit sau limită de mesaje atinsă pe OpenRouter.");
      } else {
        message.reply("❌ A apărut o eroare la procesarea AI-ului...");
      }
    }
  });
};