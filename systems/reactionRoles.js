const { Events } = require('discord.js');

const reactionMessageId = "1510462235254980608";

const rolesMap = {
  "🎧": { id: "1449203655319490612", name: "DJ" },
  "🎯": { id: "1510460244709478442", name: "CS Player" },
  "🎟️": { id: "1455752899190718485", name: "Special Guest" }
};

module.exports = (client) => {

  // =========================
  // ➕ ADD ROLE
  // =========================
  client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.id !== reactionMessageId) return;

      const roleData = rolesMap[reaction.emoji.name];
      if (!roleData) return;

      const member = await reaction.message.guild.members.fetch(user.id);
      await member.roles.add(roleData.id);

      // Mesajul tău original
      try {
        await user.send(`Bună!

Ai primit rolul **${roleData.name}** (${reaction.emoji.name}). Sistem automat:
• Adăugare rol la reacție
• Eliminare rol la scoaterea reacției

Mulțumim!`);
      } catch (err) {
        if (err.code !== 50278) console.error("Eroare DM (ADD):", err);
      }

    } catch (err) {
      console.log("Reaction ADD error:", err);
    }
  });

  // =========================
  // ➖ REMOVE ROLE
  // =========================
  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.id !== reactionMessageId) return;

      const roleData = rolesMap[reaction.emoji.name];
      if (!roleData) return;

      const member = await reaction.message.guild.members.fetch(user.id);
      await member.roles.remove(roleData.id);

      // Mesajul tău original
      try {
        await user.send(`❌ **Rol eliminat**

Reacția (${reaction.emoji.name}) a fost ștearsă și rolul **${roleData.name}** a fost scos.

Poți reveni oricând reacționând din nou 👍`);
      } catch (err) {
        if (err.code !== 50278) console.error("Eroare DM (REMOVE):", err);
      }

    } catch (err) {
      console.log("Reaction REMOVE error:", err);
    }
  });

};