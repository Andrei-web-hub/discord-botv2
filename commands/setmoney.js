const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
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
        .setName('setmoney')
        .setDescription('Setează suma de fise a unui membru (Doar Administratori)')
        .addUserOption(option => 
            option.setName('membru')
                .setDescription('Membrul căruia vrei să îi modifici fisele')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('suma')
                .setDescription('Noua sumă de fise (poate fi și 0)')
                .setRequired(true))
        // Securitate nativă Discord: comanda apare în listă doar pentru Admini
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('membru');
        const amount = interaction.options.getInteger('suma');

        if (amount < 0) {
            return interaction.reply({ content: '❌ Nu poți seta o sumă negativă de fise!', ephemeral: true });
        }

        const economy = readEconomy();

        if (!economy[targetUser.id]) {
            economy[targetUser.id] = { balance: 0, lastDaily: 0 };
        }

        // Actualizăm suma în fișier
        economy[targetUser.id].balance = amount;
        saveEconomy(economy);

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Modificare Administrativă')
            .setColor(0xe67e22)
            .setDescription(`✅ Soldul lui <@${targetUser.id}> a fost setat cu succes la **${amount} 🪙 fise** de către un administrator.`)
            .setFooter({ text: `Admin: ${interaction.user.tag}` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};