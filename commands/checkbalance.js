const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('checkbalance')
        .setDescription('Verifică balanța unui alt utilizator')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('utilizator')
                .setDescription('Selectează membrul a cărui balanță vrei să o verifici')
                .setRequired(true)
        ),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilizator');

        // Notă: Dacă folosești un alt fișier pentru bani (ex: bal.json sau economy.json), 
        // asigură-te că numele fișierului de mai jos corespunde cu cel din comanda ta /bal
        const filePath = path.join(__dirname, '..', 'economy.json'); 
        let economyData = {};

        if (fs.existsSync(filePath)) {
            try {
                economyData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (e) {
                economyData = {};
            }
        }

        // Căutăm balanța utilizatorului selectat (verifică structura ta: economyData[targetUser.id]?.balance sau direct economyData[targetUser.id])
        const userBalance = economyData[targetUser.id]?.balance ?? economyData[targetUser.id] ?? 0;

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('💳 Verificare Balanță')
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Utilizator', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: true },
                { name: 'Balanță', value: `🪙 ${userBalance.toLocaleString()} monede`, inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
