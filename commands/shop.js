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

// STRUCTURA PREMIUM DE ROLURI (Bronze -> Diamond)
const shopRoles = [
    { id: 'bronze', name: '🥉 Bronze Member', price: 1500, color: '#cd7f32', description: 'Primul pas în elita serverului. Primești o culoare de bronz rustic.' },
    { id: 'silver', name: '🥈 Silver Member', price: 4000, color: '#b0c4de', description: 'Un rang respectabil cu un look argintiu curat și elegant.' },
    { id: 'gold', name: '🥇 Gold Member', price: 8000, color: '#f1c40f', description: 'Începi să strălucești! Culoare aurie care atrage toate privirile pe chat.' },
    { id: 'platinum', name: '💿 Platinum Member', price: 15000, color: '#95a5a6', description: 'Un statut rar și exclusivist pentru membrii de top ai comunității.' },
    { id: 'diamond', name: '💎 Diamond Member', price: 30000, color: '#3498db', description: 'Rangul SUPREM! Devino o nestemată a serverului și flexează cu diamantul.' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Magazinul de roluri premium al serverului')
        .addSubcommand(sub =>
            sub.setName('lista')
                .setDescription('Vezi rangurile prețioase disponibile în magazin')
        )
        .addSubcommand(sub =>
            sub.setName('cumpara')
                .setDescription('Cumpără un rang folosind fisele tale')
                .addStringOption(option =>
                    option.setName('rang')
                        .setDescription('Alege rangul pe care vrei să îl cumperi')
                        .setRequired(true)
                        .addChoices(
                            ...shopRoles.map(r => ({ name: `${r.name} (${r.price} 🪙)`, value: r.id }))
                        )
                )),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const economy = readEconomy();

        // --- SUBCOMANDA: LISTA ---
        if (subcommand === 'lista') {
            const embed = new EmbedBuilder()
                .setTitle('🛒 Magazinul de Ranguri — Titan Bot')
                .setColor(0x34495e)
                .setDescription('Adună fise la jocuri și urcă în ierarhie! Folosește `/shop cumpara` pentru a achiziționa un rang.\n\n' + 
                    shopRoles.map(r => `**${r.name}**\n💵 Preț: \`${r.price} 🪙\`\n↳ *${r.description}*`).join('\n\n')
                )
                .setFooter({ text: `Portofelul tău: ${economy[userId]?.balance || 0} 🪙` })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        // --- SUBCOMANDA: CUMPĂRĂ ---
        if (subcommand === 'cumpara') {
            const selectedId = interaction.options.getString('rang');
            const roleData = shopRoles.find(r => r.id === selectedId);

            // Verificăm dacă are bani
            if (!economy[userId] || economy[userId].balance < roleData.price) {
                return interaction.reply({ content: `❌ Nu ai destule fise pentru acest rang! Costă **${roleData.price} 🪙**, iar tu ai doar **${economy[userId]?.balance || 0} 🪙**.`, ephemeral: true });
            }

            let existingRole = interaction.guild.roles.cache.find(r => r.name === roleData.name);

            // Dacă rolul nu există fizic pe server, botul îl creează automat acum!
            if (!existingRole) {
                try {
                    existingRole = await interaction.guild.roles.create({
                        name: roleData.name,
                        color: roleData.color,
                        reason: 'Creat automat de Titan Bot pentru Sistemul de Shop'
                    });
                } catch (err) {
                    return interaction.reply({ content: '❌ Botul nu are permisiuni suficiente (Manage Roles) pentru a crea acest rol!', ephemeral: true });
                }
            }

            // Verificăm dacă membrul îl are deja
            if (interaction.member.roles.cache.has(existingRole.id)) {
                return interaction.reply({ content: `❌ Deja deții rangul **${roleData.name}**!`, ephemeral: true });
            }

            // Încercăm să îi dăm rolul pe Discord
            try {
                await interaction.member.roles.add(existingRole);
            } catch (err) {
                return interaction.reply({ content: '❌ Nu am putut să îți ofer rolul. Asigură-te că rolul meu (`Titan Bot`) este mutat **mai sus** decât rolurile din magazin în setările serverului (Server Settings -> Roles)!', ephemeral: true });
            }

            // Totul e ok, tragem banii și salvăm
            economy[userId].balance -= roleData.price;
            saveEconomy(economy);

            const successEmbed = new EmbedBuilder()
                .setTitle('🎉 Rang Nou Achiziționat!')
                .setColor(roleData.color)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setDescription(`Felicitări <@${userId}>! Ai fost promovat oficial la statutul de **${roleData.name}**.\n\n💰 Suma retrasă: \`${roleData.price} 🪙\`\n💵 Soldul tău rămas: **${economy[userId].balance} 🪙**`)
                .setTimestamp();

            return interaction.reply({ embeds: [successEmbed] });
        }
    }
};