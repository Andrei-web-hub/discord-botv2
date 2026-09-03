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

function saveEconomy(data) {
    fs.writeFileSync(economyPath, JSON.stringify(data, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Revendică-ți fisele zilnice pentru jocuri!'),

    async execute(interaction) {
        const userId = interaction.user.id;
        const economy = readEconomy();
        const dailyAmount = 500; // Câți bani primește zilnic
        const cooldown = 24 * 60 * 60 * 1000; // 24 de ore în milisecunde

        if (!economy[userId]) {
            economy[userId] = { balance: 0, lastDaily: 0 };
        }

        const lastDaily = economy[userId].lastDaily || 0;
        const timePassed = Date.now() - lastDaily;

        if (timePassed < cooldown) {
            const timeLeft = cooldown - timePassed;
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            return interaction.reply({ 
                content: `⏳ Ai revendicat deja fisele zilnice! Revino în **${hours}h ${minutes}m**.`, 
                ephemeral: true 
            });
        }

        economy[userId].balance += dailyAmount;
        economy[userId].lastDaily = Date.now();
        saveEconomy(economy);

        const embed = new EmbedBuilder()
            .setTitle('💰 Fise Zilnice')
            .setColor(0x2ecc71)
            .setDescription(`Ai primit **${dailyAmount} 🪙 fise** virtuale!\n💵 Soldul tău actual: **${economy[userId].balance} 🪙**`)
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};