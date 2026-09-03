const { Events, EmbedBuilder } = require('discord.js');

const STAFF_LOG_CHANNEL_ID = '1544371893535117454'; //

module.exports = (client) => {
    // 1. Log pentru mesaje șterse (cu verificare completă de cache)
    client.on(Events.MessageDelete, async (message) => {
        if (!message || !message.guild) return;
        if (!message.author || message.author.bot) return;

        const logChannel = message.guild.channels.cache.get(STAFF_LOG_CHANNEL_ID);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🗑️ Mesaj Șters / Message Deleted')
            .addFields(
                { name: 'Autor / Author', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: 'Canal / Channel', value: `${message.channel}`, inline: true },
                { name: 'Conținut / Content', value: message.content ? message.content.slice(0, 1024) : '*Fără text / Media*' }
            )
            .setTimestamp();

        try { await logChannel.send({ embeds: [embed] }); } catch (e) {}
    });

    // 2. Log pentru banuri
    client.on(Events.GuildBanAdd, async (ban) => {
        const logChannel = ban.guild.channels.cache.get(STAFF_LOG_CHANNEL_ID);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🔨 Membru Banat / Member Banned')
            .addFields(
                { name: 'Utilizator / User', value: `${ban.user.tag} (${ban.user.id})`, inline: true }
            )
            .setTimestamp();

        try { await logChannel.send({ embeds: [embed] }); } catch (e) {}
    });

    // 3. Log pentru Mute / Timeout (Text/Scriere) & Voice Mute / Voice Move
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        const logChannel = newMember.guild.channels.cache.get(STAFF_LOG_CHANNEL_ID);
        if (!logChannel) return;

        const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
        const newTimeout = newMember.communicationDisabledUntilTimestamp;

        // A. Timeout clasic (Text Mute)
        if (!oldTimeout && newTimeout) {
            const embed = new EmbedBuilder()
                .setColor('#FEE75C')
                .setTitle('🔇 Membru Primit Timeout (Mute Text)')
                .addFields(
                    { name: 'Utilizator / User', value: `${newMember.user.tag} (${newMember.user.id})`, inline: true },
                    { name: 'Expiră la / Expires At', value: `<t:${Math.floor(newTimeout / 1000)}:F>`, inline: true }
                )
                .setTimestamp();

            try { await logChannel.send({ embeds: [embed] }); } catch (e) {}
        }
    });

    // 4. Log pentru acțiuni vocale (Server Mute / Unmute și Mutare de către staff)
    client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
        const member = newState.member;
        if (!member || member.user.bot) return;

        const guild = newState.guild;
        const logChannel = guild.channels.cache.get(STAFF_LOG_CHANNEL_ID);
        if (!logChannel) return;

        try {
            const fetchLogs = await guild.fetchAuditLogs({ limit: 1 });
            const auditLog = fetchLogs.entries.first();

            // A. Server Mute / Unmute în canalul vocal
            if (oldState.serverMute !== newState.serverMute) {
                const isMuted = newState.serverMute;
                const embed = new EmbedBuilder()
                    .setColor(isMuted ? '#FF0000' : '#00FF00')
                    .setTitle(isMuted ? '🔇 Membru dat pe Server Mute' : '🔊 Membru scos de pe Server Mute')
                    .addFields(
                        { name: 'Utilizator', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                        { name: 'Status', value: isMuted ? 'Mute' : 'Unmuted', inline: true }
                    )
                    .setTimestamp();

                if (auditLog && (Date.now() - auditLog.createdTimestamp < 5000)) {
                    embed.addFields({ name: 'Moderator', value: `${auditLog.executor.tag}`, inline: true });
                }

                try { await logChannel.send({ embeds: [embed] }); } catch (e) {}
                return;
            }

            // B. Mutat dintr-un canal vocal în altul de către un moderator (MEMBER_MOVE)
            if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
                if (auditLog && auditLog.action === 24 && auditLog.target.id === member.id) {
                    // Acțiunea 24 = MEMBER_MOVE în Audit Logs
                    const embed = new EmbedBuilder()
                        .setColor('#FFA500')
                        .setTitle('↔️ Membru Mutat în alt Canal Vocal')
                        .addFields(
                            { name: 'Utilizator', value: `${member.user.tag} (<@${member.id}>)`, inline: true },
                            { name: 'De la', value: `<#${oldState.channelId}>`, inline: true },
                            { name: 'La', value: `<#${newState.channelId}>`, inline: true },
                            { name: 'Moderator', value: `${auditLog.executor.tag} (<@${auditLog.executor.id}>)`, inline: false }
                        )
                        .setTimestamp();

                    try { await logChannel.send({ embeds: [embed] }); } catch (e) {}
                }
            }
        } catch (error) {
            console.error('Eroare la logurile vocale de staff:', error);
        }
    });
};