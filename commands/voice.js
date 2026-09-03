const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice')
        .setDescription('Afișează topul celor mai activi membri de pe canalele vocale!'),

    async execute(interaction) {
        const dataPath = path.join(__dirname, '../voiceData.json');

        if (!fs.existsSync(dataPath)) {
            return interaction.reply({ content: '❌ Nu există date înregistrate încă pe acest server.', ephemeral: true });
        }

        let data;
        try {
            data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        } catch (e) {
            return interaction.reply({ content: '❌ Baza de date este coruptă sau goală.', ephemeral: true });
        }

        // Sortăm descrescător și luăm primii 10
        const sorted = Object.entries(data)
            .sort((a, b) => b[1].time - a[1].time)
            .slice(0, 10);

        if (sorted.length === 0) {
            return interaction.reply({ content: '❌ Nu există destule date pentru a genera un clasament.', ephemeral: true });
        }

        // Generăm textul stilizat pentru leaderboard
        const leaderboardRows = sorted.map((u, i) => {
            const time = u[1].time;
            
            // Calculăm orele și minutele cu precizie matematică
            const hours = Math.floor(time / (1000 * 60 * 60));
            const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));

            // Emoji-uri personalizate pentru podium (Locurile 1, 2, 3) vs restul
            let medal = `\`#${i + 1}\``;
            if (i === 0) medal = '🥇';
            if (i === 1) medal = '🥈';
            if (i === 2) medal = '🥉';

            return `${medal} <@${u[0]}> — **${hours}h ${minutes}m**`;
        }).join('\n');

        // Design premium pentru Embed
        const embed = new EmbedBuilder()
            .setTitle('🎤 Voice Activity Leaderboard')
            .setColor(0x5865F2) // Albastru Discord vibrant
            .setDescription(
                `🏆 **Top 10 Cei mai activi membri pe Voice:**\n\n${leaderboardRows}\n\n` +
                `📈 *Timpul se actualizează automat de fiecare dată când părăsești sau schimbi canalul.*`
            )
            .setThumbnail(interaction.guild.iconURL({ dynamic: true }) || null)
            .setFooter({ text: `Solicitat de ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};