const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const economyPath = path.join(__dirname, '../economy.json');

// Multiplicatori reduși pentru o economie sănătoasă
const slotData = {
    '🍒': { multi3: 3, multi2: 1.5 },   // 3x și 1.5x
    '🍋': { multi3: 4, multi2: 1.8 },   // 4x și 1.8x
    '🍇': { multi3: 6, multi2: 2 },     // 6x și 2x
    '🔔': { multi3: 8, multi2: 2.5 },   // 8x și 2.5x
    '💎': { multi3: 12, multi2: 3 },    // 12x și 3x
    '7️⃣': { multi3: 20, multi2: 5 }     // Jackpot-ul acum este de 20x (mai sigur pentru server)
};

const emojis = Object.keys(slotData);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slots')
        .setDescription('Joacă la păcănele (economie echilibrată)')
        .addIntegerOption(option => option.setName('suma').setDescription('Suma pariată').setRequired(true)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger('suma');
        let economy = JSON.parse(fs.readFileSync(economyPath, 'utf8'));

        if (!economy[userId] || economy[userId].balance < bet) 
            return interaction.reply({ content: `❌ Sold insuficient!`, ephemeral: true });

        economy[userId].balance -= bet;
        fs.writeFileSync(economyPath, JSON.stringify(economy, null, 2));

        const s1 = emojis[Math.floor(Math.random() * emojis.length)];
        const s2 = emojis[Math.floor(Math.random() * emojis.length)];
        const s3 = emojis[Math.floor(Math.random() * emojis.length)];

        let winnings = 0;
        let message = `❌ Necâștigător!`;

        // 1. Verificare JACKPOT (3 la fel)
        if (s1 === s2 && s2 === s3) {
            winnings = Math.floor(bet * slotData[s1].multi3);
            message = `🔥 **JACKPOT!** 3x ${s1}! Ai câștigat ${winnings} 🪙!`;
        } 
        // 2. Verificare 2 la fel ALINIATE (s1+s2 sau s2+s3)
        else if (s1 === s2 || s2 === s3) {
            const symbol = (s1 === s2) ? s1 : s2;
            winnings = Math.floor(bet * slotData[symbol].multi2);
            message = `🎉 **Bravo!** Ai aliniat două ${symbol}! Ai câștigat ${winnings} 🪙.`;
        }

        if (winnings > 0) {
            economy = JSON.parse(fs.readFileSync(economyPath, 'utf8'));
            economy[userId].balance += winnings;
            fs.writeFileSync(economyPath, JSON.stringify(economy, null, 2));
        }

        const embed = new EmbedBuilder()
            .setTitle('🎰 Titan Casino')
            .setColor(winnings > 0 ? 0x2ecc71 : 0xe74c3c)
            .setDescription(`🎰 | \`[ ${s1} ]\` \`[ ${s2} ]\` \`[ ${s3} ]\`\n\n${message}`)
            .setFooter({ text: `Sold: ${economy[userId].balance} 🪙` });

        await interaction.reply({ embeds: [embed] });
    }
};