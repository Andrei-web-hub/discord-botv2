const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Afișează informații despre Titan Bot și lista completă de comenzi publice'),

    async execute(interaction, client) {
        // Preluăm avatarul botului pentru design
        const botAvatar = client.user.displayAvatarURL({ dynamic: true });

        // --- ALGORITM DE ACTUALIZARE AUTOMATĂ A COMENZILOR SLASH ---
        // Ascundem complet comenzile administrative din lista publică afișată utilizatorilor
        const hiddenCommands = ['setmoney', 'antispam', 'antibot'];
        
        const publicSlashCommands = client.commands
            .filter(cmd => !hiddenCommands.includes(cmd.data.name))
            .map(cmd => `• \`/${cmd.data.name}\` — ${cmd.data.description}`)
            .join('\n');

        // Secțiune dedicată pentru comenzile cu prefix text (cum este !ai)
        const prefixCommands = [
            `• \`!ai [mesaj]\` — Pune-i o întrebare inteligentă botului și el îți va răspunde live folosind AI-ul.`
        ].join('\n');

        // Design premium pentru Embed-ul de Info
        const embed = new EmbedBuilder()
            .setTitle(`🤖 Informații & Comenzi — ${client.user.username}`)
            .setColor(0x5865F2) // Albastru Discord vibrant
            .setDescription(
                `Salutare! Eu sunt **Titan Bot**, asistentul tău multifuncțional specializat în divertisment, economie, monitorizare voice și securitate.\n\n` +
                `Mai jos găsești lista completă de comenzi pe care le poți folosi pe server.`
            )
            .setThumbnail(botAvatar) // Afișează automat poza botului în colț
            .addFields(
                { 
                    name: '🎮 Comenzi Publice (Slash Commands)', 
                    value: publicSlashCommands || 'Nu există comenzi publice momentan.', 
                    inline: false 
                },
                { 
                    name: '🔮 Comenzi Chat (Prefix Text)', 
                    value: prefixCommands, 
                    inline: false 
                },
                {
                    name: '📈 Statistici Bot',
                    value: `• Serverele noastre: \`${client.guilds.cache.size}\`\n• Canale monitorizate: \`${client.channels.cache.size}\``,
                    inline: true
                }
            )
            .setFooter({ text: `Titan Bot • Sistem actualizat automat`, iconURL: botAvatar })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};