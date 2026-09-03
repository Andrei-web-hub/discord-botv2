const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    PermissionFlagsBits
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antispam')
        .setDescription('Setări și panou de control anti-spam')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('stats')
                .setDescription('Vezi setările și controlează sistemul anti-spam')
        ),

    async execute(interaction, client, { antiSpamConfig, saveConfig }) {
        // 🔒 Verificare de securitate: Doar administratorii pot folosi această comandă
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                content: '❌ Nu ai permisiunea necesară (Administrator) pentru a folosi acest panou de control!', 
                ephemeral: true 
            });
        }

        // Ne asigurăm că rulăm doar subcomanda 'stats'
        if (interaction.options.getSubcommand() !== 'stats') return;

        // Funcție internă pentru a genera Embed-ul cu starea actuală
        const generateEmbed = () => {
            return new EmbedBuilder()
                .setTitle('🛡️ Panou de Control Anti-Spam')
                .setColor(antiSpamConfig.enabled ? 0x2ecc71 : 0xe74c3c)
                .setDescription('Gestionează setările de protecție împotriva spamului de pe server folosind butoanele de mai jos.')
                .addFields(
                    { name: 'Stare Sistem', value: antiSpamConfig.enabled ? '🟢 **ACTIVAT**' : '🔴 **DEZACTIVAT**', inline: false },
                    { name: 'Limită Mesaje', value: `\`${antiSpamConfig.limit} mesaje\``, inline: true },
                    { name: 'Interval Timp', value: `\`${antiSpamConfig.interval / 1000} secunde\``, inline: true },
                    { name: 'Durată Timeout', value: `\`${antiSpamConfig.timeout / 1000} secunde\``, inline: true }
                )
                .setFooter({ text: 'Titan Bot Protection System' })
                .setTimestamp();
        };

        // Funcție internă pentru a genera butoanele live
        const generateButtons = () => {
            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('antispam_on')
                    .setLabel('Activează')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(antiSpamConfig.enabled),
                new ButtonBuilder()
                    .setCustomId('antispam_off')
                    .setLabel('Dezactivează')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!antiSpamConfig.enabled),
                new ButtonBuilder()
                    .setCustomId('antispam_edit')
                    .setLabel('Modifică Valori')
                    .setStyle(ButtonStyle.Primary)
            );
        };

        // Trimitem panoul inițial
        const response = await interaction.reply({
            embeds: [generateEmbed()],
            components: [generateButtons()],
            fetchReply: true
        });

        // Creăm colectorul pentru butoane (valabil 5 minute)
        const collector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 300000
        });

        collector.on('collect', async (i) => {
            // Verificăm suplimentar dacă cel care apasă butonul este administrator
            if (!i.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return i.reply({ content: '❌ Nu ai permisiunea necesară pentru a folosi acest buton!', ephemeral: true });
            }

            // Verificăm dacă cel care apasă butonul este cel care a dat comanda
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'Nu poți folosi acest panou de control!', ephemeral: true });
            }

            // Butonul ACTIVARE
            if (i.customId === 'antispam_on') {
                antiSpamConfig.enabled = true;
                saveConfig(); 
                return i.update({ embeds: [generateEmbed()], components: [generateButtons()] });
            }

            // Butonul DEZACTIVARE
            if (i.customId === 'antispam_off') {
                antiSpamConfig.enabled = false;
                saveConfig(); 
                return i.update({ embeds: [generateEmbed()], components: [generateButtons()] });
            }

            // Butonul MODIFICARE VALORI (Deschide o fereastră pop-up / Modal)
            if (i.customId === 'antispam_edit') {
                const modal = new ModalBuilder()
                    .setCustomId('antispam_modal')
                    .setTitle('Configurare Anti-Spam');

                const limitInput = new TextInputBuilder()
                    .setCustomId('modal_limit')
                    .setLabel('Limită mesaje (ex: 3)')
                    .setStyle(TextInputStyle.Short)
                    .setValue(antiSpamConfig.limit.toString())
                    .setRequired(true);

                const intervalInput = new TextInputBuilder()
                    .setCustomId('modal_interval')
                    .setLabel('Interval în secunde (ex: 3)')
                    .setStyle(TextInputStyle.Short)
                    .setValue((antiSpamConfig.interval / 1000).toString())
                    .setRequired(true);

                const timeoutInput = new TextInputBuilder()
                    .setCustomId('modal_timeout')
                    .setLabel('Mute/Timeout în secunde (ex: 60)')
                    .setStyle(TextInputStyle.Short)
                    .setValue((antiSpamConfig.timeout / 1000).toString())
                    .setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(limitInput),
                    new ActionRowBuilder().addComponents(intervalInput),
                    new ActionRowBuilder().addComponents(timeoutInput)
                );

                await i.showModal(modal);

                const submitted = await i.awaitModalSubmit({ time: 60000 }).catch(() => null);

                if (submitted) {
                    const newLimit = parseInt(submitted.fields.getTextInputValue('modal_limit'));
                    const newInterval = parseInt(submitted.fields.getTextInputValue('modal_interval')) * 1000;
                    const newTimeout = parseInt(submitted.fields.getTextInputValue('modal_timeout')) * 1000;

                    if (isNaN(newLimit) || isNaN(newInterval) || isNaN(newTimeout)) {
                        return submitted.reply({ content: '❌ Te rog să introduci doar numere valide!', ephemeral: true });
                    }

                    antiSpamConfig.limit = newLimit;
                    antiSpamConfig.interval = newInterval;
                    antiSpamConfig.timeout = newTimeout;
                    saveConfig(); 

                    await submitted.reply({ content: '✅ Setările au fost salvate cu succes!', ephemeral: true });
                    await interaction.editReply({ embeds: [generateEmbed()], components: [generateButtons()] });
                }
            }
        });

        collector.on('end', () => {
            const disabledRows = generateButtons().components.map(btn => btn.setDisabled(true));
            interaction.editReply({ components: [new ActionRowBuilder().addComponents(disabledRows)] }).catch(() => null);
        });
    }
};