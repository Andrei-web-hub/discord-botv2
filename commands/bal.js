const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const economyPath = path.join(__dirname, '../economy.json');

function readEconomy() {
    if (!fs.existsSync(economyPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(economyPath, 'utf8'));
    } catch (e) {
        return {};
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bal')
        .setDescription('Verifică câte fise ai în portofel')
        .addUserOption(option => 
            option.setName('utilizator')
                .setDescription('Utilizatorul al cărui sold vrei să îl vezi (opțional)')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('utilizator') || interaction.user;
        const economy = readEconomy();
        
        const balance = economy[targetUser.id]?.balance || 0;

        const embed = new EmbedBuilder()
            .setTitle('💳 Portofel Virtual')
            .setColor(0x3498db)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setDescription(`${targetUser.id === interaction.user.id ? 'Tu ai' : `<@${targetUser.id}> are`} în prezent:\n💵 **${balance} 🪙 fise**`)
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};