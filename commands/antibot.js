const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

let isAntiBotActive = true;
const BAN_CHANNEL_ID = '1544361220558163978'; // Pune ID-ul tău corect aici

// Calea către un fișier mic pentru a salva contorul de banuri
const counterFile = path.join(__dirname, '../data_antibot.json');

function getBlockedCount() {
    try {
        if (fs.existsSync(counterFile)) {
            const data = JSON.parse(fs.readFileSync(counterFile, 'utf8'));
            return data.count || 0;
        }
    } catch (e) {}
    return 0;
}

function incrementBlockedCount() {
    const current = getBlockedCount() + 1;
    try {
        fs.writeFileSync(counterFile, JSON.stringify({ count: current }, null, 2));
    } catch (e) {}
    return current;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antibot')
        .setDescription('Gestionează sistemul de Anti-Bot / Auto-Ban')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Activează sau dezactivează sistemul de auto-ban')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Trimite panoul de avertizare mare în canal')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'toggle') {
            isAntiBotActive = !isAntiBotActive;
            const statusText = isAntiBotActive ? 'activat 🟢' : 'dezactivat 🔴';
            return interaction.reply({ 
                content: `Sistemul de Anti-Bot a fost **${statusText}**!`, 
                ephemeral: true 
            });
        } 
        
        if (subcommand === 'setup') {
            const channel = interaction.guild.channels.cache.get(BAN_CHANNEL_ID);
            if (!channel) {
                return interaction.reply({ 
                    content: 'Nu am găsit canalul setat pentru Anti-Bot! Verifică ID-ul.', 
                    ephemeral: true 
                });
            }

            const blockedCount = getBlockedCount().toLocaleString();

            // Embed personalizat, mare, bilingv (RO / EN)
            const embed = new EmbedBuilder()
                .setColor('#990000')
                .setTitle('🚨 CANAL SECURIZAT • SECURE CHANNEL 🚨')
                .setDescription(
                    '# 🛑 NU SCRIE AICI! / DO NOT TYPE HERE!\n\n' +
                    '> **RO:** Orice mesaj trimis pe acest canal va atrage după sine **BAN AUTOMAT** instant, fără avertisment.\n' +
                    '> **EN:** Any message sent in this channel will result in an instant **AUTOMATED BAN**, without warning.\n\n' +
                    '---'
                )
                .addFields(
                    { 
                        name: '🛡️ Detalii / Details', 
                        value: 'Acest canal este monitorizat automat pentru boți de spam, conturi compromise și unelte de raid.\n*This channel is monitored automatically for spam bots, compromised accounts, and raid tools.*' 
                    },
                    { 
                        name: '📊 Membri Blocați / Members Blocked', 
                        value: `\`\`\`fix\n${blockedCount}\n\`\`\``,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: 'Titans Anti-Bot System • Actualizat dinamic', 
                    iconURL: interaction.guild.iconURL() 
                })
                .setTimestamp();

            const sentMessage = await channel.send({ embeds: [embed] });
            
            // Salvăm ID-ul ultimului mesaj trimis pentru a-l putea actualiza automat mai târziu
            global.antiBotPanelMessageId = sentMessage.id;

            return interaction.reply({ 
                content: 'Panoul bilingv și mărit a fost trimis cu succes!', 
                ephemeral: true 
            });
        }
    },
    
    getAntiBotStatus: () => isAntiBotActive,
    getBanChannelId: () => BAN_CHANNEL_ID,
    incrementBlockedCount,
    getBlockedCount
};