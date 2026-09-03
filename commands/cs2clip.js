const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cs2clip')
        .setDescription('Adaugă un clip TikTok cu smoke CS2 în coada automată')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('url')
                .setDescription('Link-ul TikTok')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('titlu')
                .setDescription('Titlul sau descrierea brută')
                .setRequired(true)
        ),
    async execute(interaction) {
        const url = interaction.options.getString('url');
        const rawTitle = interaction.options.getString('titlu');

        const filePath = path.join(__dirname, '..', 'smokesQueue.json');
        let queue = [];
        if (fs.existsSync(filePath)) {
            try {
                queue = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (e) {
                queue = [];
            }
        }

        queue.push({ url, rawTitle });
        fs.writeFileSync(filePath, JSON.stringify(queue, null, 2), 'utf8');

        await interaction.reply({ 
            content: `✅ Clipul a fost adăugat în coadă!\n🔗 **Link:** ${url}\n📌 **Titlu brut:** ${rawTitle}\n📊 **Total în coadă:** ${queue.length}`, 
            ephemeral: true 
        });
    }
};