const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xo')
        .setDescription('Provoacă un prieten la o partidă de X și Zero!')
        .addUserOption(option => 
            option.setName('adversar')
                .setDescription('Utilizatorul pe care vrei să îl provoci')
                .setRequired(true)),

    async execute(interaction) {
        const challenger = interaction.user;
        const opponent = interaction.options.getUser('adversar');

        // Verificări de siguranță
        if (opponent.id === challenger.id) {
            return interaction.reply({ content: 'Nu te poți provoca singur!', ephemeral: true });
        }
        if (opponent.bot) {
            return interaction.reply({ content: 'Nu poți juca împotriva unui bot!', ephemeral: true });
        }

        // 1. Trimitem invitația cu butoane
        const inviteRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('accept_ttt').setLabel('Acceptă').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('decline_ttt').setLabel('Refuză').setStyle(ButtonStyle.Danger)
        );

        const response = await interaction.reply({
            content: `⚔️ ${opponent}, ai fost provocat la X și Zero de către ${challenger}! Ai 30 de secunde să accepți.`,
            components: [inviteRow]
        });

        // Colector pentru invitație
        const inviteCollector = response.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 30000
        });

        inviteCollector.on('collect', async i => {
            if (i.user.id !== opponent.id) {
                return i.reply({ content: 'Doar cel provocat poate răspunde!', ephemeral: true });
            }

            if (i.customId === 'decline_ttt') {
                inviteCollector.stop();
                return i.update({ content: `❌ ${opponent} a refuzat provocarea.`, components: [] });
            }

            if (i.customId === 'accept_ttt') {
                inviteCollector.stop();
                
                let board = Array(9).fill(null);
                let turn = challenger.id; // Începe cel care a dat comanda

                // Funcție care generează cele 3 rânduri de butoane (matricea 3x3)
                const makeGrid = () => {
                    const rows = [];
                    for (let i = 0; i < 3; i++) {
                        const row = new ActionRowBuilder();
                        for (let j = 0; j < 3; j++) {
                            const index = i * 3 + j;
                            const btn = new ButtonBuilder()
                                .setCustomId(`ttt_${index}`)
                                .setLabel(board[index] ? board[index] : '➖')
                                .setStyle(board[index] === 'X' ? ButtonStyle.Primary : board[index] === 'O' ? ButtonStyle.Danger : ButtonStyle.Secondary)
                                .setDisabled(board[index] !== null);
                            row.addComponents(btn);
                        }
                        rows.push(row);
                    }
                    return rows;
                };

                const gameMessage = await i.update({
                    content: `🎮 Jocul a început!\n➡️ Rândul lui: <@${turn}> (**X**)\n🟦 <@${challenger.id}> = **X**\n🟥 <@${opponent.id}> = **O**`,
                    components: makeGrid()
                });

                const gameCollector = gameMessage.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 600000 // 10 minute max per meci
                });

                gameCollector.on('collect', async gameInteraction => {
                    if (gameInteraction.user.id !== turn) {
                        return gameInteraction.reply({ content: 'Nu este rândul tău!', ephemeral: true });
                    }

                    const index = parseInt(gameInteraction.customId.split('_')[1]);
                    board[index] = turn === challenger.id ? 'X' : 'O';

                    // Verificăm dacă avem un câștigător
                    const winPatterns = [
                        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Orizontal
                        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Vertical
                        [0, 4, 8], [2, 4, 6]             // Diagonal
                    ];

                    let winner = null;
                    for (const pattern of winPatterns) {
                        const [a, b, c] = pattern;
                        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                            winner = board[a];
                            break;
                        }
                    }

                    if (winner) {
                        gameCollector.stop();
                        const finalRows = makeGrid().map(row => {
                            row.components.forEach(btn => btn.setDisabled(true));
                            return row;
                        });
                        return gameInteraction.update({
                            content: `🏆 **FELICITĂRI!** <@${turn}> a câștigat meciul! 🎉`,
                            components: finalRows
                        });
                    }

                    // Verificăm dacă e remiză
                    if (board.every(cell => cell !== null)) {
                        gameCollector.stop();
                        return gameInteraction.update({
                            content: `🤝 **Remiză!** Nimeni nu a câștigat de data asta.`,
                            components: makeGrid().map(row => {
                                row.components.forEach(btn => btn.setDisabled(true));
                                return row;
                            })
                        });
                    }

                    // Schimbăm rândul
                    turn = turn === challenger.id ? opponent.id : challenger.id;
                    const currentSign = turn === challenger.id ? 'X' : 'O';

                    await gameInteraction.update({
                        content: `🎮 Meci în desfășurare...\n➡️ Rândul lui: <@${turn}> (**${currentSign}**)`,
                        components: makeGrid()
                    });
                });

                gameCollector.on('end', async (collected, reason) => {
                    if (reason === 'time') {
                        await interaction.editReply({ content: '⏰ Jocul a fost anulat deoarece un jucător a expirat (AFK).', components: [] });
                    }
                });
            }
        });
    }
};