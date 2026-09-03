const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { postSmokeToForum } = require('../tiktokSmokes');

const FORUM_CHANNEL_ID = '1544593475545079838'; // Asigură-te că e ID-ul corect

module.exports = {
    data: new SlashCommandBuilder()
        .setName('postnow')
        .setDescription('Postează instant primul clip din coada de TikTok CS2')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        const filePath = path.join(__dirname, '..', 'smokesQueue.json');
        if (!fs.existsSync(filePath)) {
            return interaction.reply({ content: 'Fișierul de coadă nu există!', ephemeral: true });
        }

        let queue = [];
        try {
            queue = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (e) {
            return interaction.reply({ content: 'Eroare la citirea cozii.', ephemeral: true });
        }

        if (queue.length === 0) {
            return interaction.reply({ content: 'Coada este goală! Adaugă mai întâi un clip cu /cs2clip.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const currentItem = queue.shift();
        await postSmokeToForum(client, FORUM_CHANNEL_ID, currentItem.url, currentItem.rawTitle);

        fs.writeFileSync(filePath, JSON.stringify(queue, null, 2), 'utf8');

        await interaction.editReply({ content: `🚀 Clipul a fost postat instant în forum!\n🔗 **Link:** ${currentItem.url}` });
    }
};