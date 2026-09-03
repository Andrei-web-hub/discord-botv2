const fs = require('fs');
const path = require('path');
const { PermissionsBitField } = require('discord.js');

const users = new Map();

module.exports = (client) => {

  client.on('messageCreate', async (message) => {
    if (!message.guild) return;
    if (message.author.bot) return;

    // Administratorii sunt exceptați de la anti-spam
    if (message.member?.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    // Citim dinamic config.json direct de pe disc
    const configFile = path.join(__dirname, '../config.json');
    let antiSpamConfig = { enabled: true, limit: 3, interval: 3000, timeout: 60000 };

    if (fs.existsSync(configFile)) {
      try {
        antiSpamConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      } catch (e) {}
    }

    // Verificăm dacă sistemul este activat
    if (!antiSpamConfig.enabled) return;

    const id = message.author.id;
    const now = Date.now();

    if (!users.has(id)) {
      users.set(id, {
        count: 1,
        last: now
      });
      return;
    }

    const data = users.get(id);

    // Reset dacă a trecut intervalul
    if (now - data.last > antiSpamConfig.interval) {
      data.count = 1;
      data.last = now;
      users.set(id, data);
      return;
    }

    data.count++;

    // Dacă face spam
    if (data.count >= antiSpamConfig.limit) {
      // 1. Ștergem mesajul curent de spam
      message.delete().catch(() => {});

      // 2. Aplicăm Timeout (Mute) folosind durata setată în config.json
      try {
        if (message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
          await message.member.timeout(antiSpamConfig.timeout, 'Anti-Spam: Mesaje trimise prea repede.');
        }
      } catch (err) {
        console.error('Nu s-a putut aplica timeout-ul (verifică ierarhia rolurilor):', err);
      }

      // 3. Trimitem avertismentul temporar
      const seconds = antiSpamConfig.timeout / 1000;
      message.channel.send(`⛔ ${message.author}, ai primit **timeout ${seconds} secunde** pentru spam!`).then(msg => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });

      data.count = 0;
    }

    users.set(id, data);
  });

};