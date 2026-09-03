const { Events, PermissionsBitField, EmbedBuilder } = require('discord.js');
const antiBotCommand = require('../commands/antibot');

module.exports = (client) => {
    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot) return;

        const banChannelId = antiBotCommand.getBanChannelId ? antiBotCommand.getBanChannelId() : '1544361220558163978';
        if (message.channel.id !== banChannelId) return;

        if (antiBotCommand.getAntiBotStatus && !antiBotCommand.getAntiBotStatus()) return;

        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

        try {
            await message.delete();
            await message.guild.members.ban(message.author.id, { 
                reason: 'Auto-ban: Mesaj trimis pe canalul securizat Anti-Bot.' 
            });

            // Incrementăm contorul și obținem valoarea nouă
            const newCount = antiBotCommand.incrementBlockedCount();
            console.log(`[ANTI-BOT] I-a dat ban lui ${message.author.tag}. Total blocați: ${newCount}`);

            // Căutare sigură și automată a panoului în canal pentru a-i actualiza cifra în timp real
            const channel = message.guild.channels.cache.get(banChannelId);
            if (channel) {
                try {
                    const messages = await channel.messages.fetch({ limit: 10 });
                    const panelMessage = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0 && m.embeds[0].title.includes('CANAL SECURIZAT'));
                    
                    if (panelMessage) {
                        const oldEmbed = panelMessage.embeds[0];
                        const updatedFields = [...oldEmbed.fields];
                        updatedFields[1] = {
                            name: '📊 Membri Blocați / Members Blocked',
                            value: `\`\`\`fix\n${newCount.toLocaleString()}\n\`\`\``,
                            inline: true
                        };

                        const newEmbed = EmbedBuilder.from(oldEmbed).setFields(updatedFields);
                        await panelMessage.edit({ embeds: [newEmbed] });
                    }
                } catch (err) {
                    console.log('Nu s-a putut actualiza automat embed-ul în timp real:', err);
                }
            }

        } catch (error) {
            console.error('Eroare la aplicarea banului automat:', error);
        }
    });
};