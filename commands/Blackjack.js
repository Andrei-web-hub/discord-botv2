const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
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

function createDeck() {
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const values = [
        { name: '2', val: 2 }, { name: '3', val: 3 }, { name: '4', val: 4 },
        { name: '5', val: 5 }, { name: '6', val: 6 }, { name: '7', val: 7 },
        { name: '8', val: 8 }, { name: '9', val: 9 }, { name: '10', val: 10 },
        { name: 'J', val: 10 }, { name: 'Q', val: 10 }, { name: 'K', val: 10 },
        { name: 'A', val: 11 }
    ];
    
    let deck = [];
    for (let suit of suits) {
        for (let value of values) {
            deck.push({ name: value.name, suit: suit, value: value.val });
        }
    }
    return deck.sort(() => Math.random() - 0.5);
}

function calculateScore(hand) {
    let score = hand.reduce((acc, card) => acc + card.value, 0);
    let aces = hand.filter(card => card.name === 'A').length;
    while (score > 21 && aces > 0) { score -= 10; aces--; }
    return score;
}

function displayHand(hand, hideFirst = false) {
    if (hideFirst) return `🃏 \`[ ? ]\` , ${hand.slice(1).map(c => `\`[ ${c.name}${c.suit} ]\``).join(', ')}`;
    return hand.map(c => `\`[ ${c.name}${c.suit} ]\``).join(', ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Joacă o partidă de BlackJack (x2 câștig, x4 Blackjack)')
        .addIntegerOption(option => option.setName('suma').setDescription('Suma de fise').setRequired(true)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const bet = interaction.options.getInteger('suma');
        const economy = readEconomy();

        if (!economy[userId] || economy[userId].balance < bet) return interaction.reply({ content: `❌ Sold insuficient!`, ephemeral: true });
        if (bet <= 0) return interaction.reply({ content: '❌ Pariu invalid!', ephemeral: true });

        economy[userId].balance -= bet;
        saveEconomy(economy);

        const deck = createDeck();
        let playerHand = [deck.pop(), deck.pop()];
        let dealerHand = [deck.pop(), deck.pop()];
        let playerScore = calculateScore(playerHand);
        let dealerScore = calculateScore(dealerHand);

        const generateEmbed = (gameOver = false, statusText = 'Alege!') => new EmbedBuilder()
            .setTitle('🃏 Masa de BlackJack')
            .setColor(gameOver ? 0x2b2d31 : 0xf1c40f)
            .setDescription(`💰 **Pariu:** ${bet} 🪙\n\n${statusText}`)
            .addFields(
                { name: `🧔 Dealer (Scor: ${gameOver ? dealerScore : '?'})`, value: displayHand(dealerHand, !gameOver) },
                { name: `👤 Tu (Scor: ${playerScore})`, value: displayHand(playerHand) }
            )
            .setFooter({ text: `Sold: ${readEconomy()[userId].balance} 🪙` });

        if (playerScore === 21) {
            economy[userId].balance += (bet * 4); // Multiplicator x4 pentru Blackjack
            saveEconomy(economy);
            return interaction.reply({ embeds: [generateEmbed(true, '🎉 **BLACKJACK!** Ai câștigat x4!')] });
        }

        const response = await interaction.reply({ embeds: [generateEmbed()], components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand').setStyle(ButtonStyle.Danger)
        )], fetchReply: true });

        const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== userId) return i.reply({ content: 'Nu este jocul tău!', ephemeral: true });
            if (i.customId === 'bj_hit') {
                playerHand.push(deck.pop());
                playerScore = calculateScore(playerHand);
                if (playerScore > 21) {
                    collector.stop();
                    return i.update({ embeds: [generateEmbed(true, '💥 Bust! Ai pierdut.')], components: [] });
                }
                return i.update({ embeds: [generateEmbed()] });
            } else {
                collector.stop();
                while (dealerScore < 17) { dealerHand.push(deck.pop()); dealerScore = calculateScore(dealerHand); }
                let finalEconomy = readEconomy();
                let msg = '';
                if (dealerScore > 21 || playerScore > dealerScore) {
                    finalEconomy[userId].balance += (bet * 2); // Multiplicator x2 normal
                    msg = '🎉 Ai câștigat x2!';
                } else if (playerScore < dealerScore) {
                    msg = '❌ Ai pierdut.';
                } else {
                    finalEconomy[userId].balance += bet;
                    msg = '🤝 Remiză (Push).';
                }
                saveEconomy(finalEconomy);
                return i.update({ embeds: [generateEmbed(true, msg)], components: [] });
            }
        });
    }
};