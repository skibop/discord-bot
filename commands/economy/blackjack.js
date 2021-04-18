const Discord = require("discord.js");

module.exports = {
    name: "blackjack",
    aliases: ["bj"],
    description: "the card game",
    usage: "<amount>",
    cooldown: 6,
    async execute(client, message, args) {
        const { bal } = client;
        const userBal = await bal.get(message.author.id);

        const bet = parseInt(args[0]);

        if (userBal === undefined) return message.channel.send("You haven't started using currency yet. Use `=start` to get started.");
        else if (!args[0] || isNaN(args[0])) return message.channel.send("You didn't say how much to bet!");
        else if (bet < 500) return message.channel.send("You can't bet less than 500.");
        else if (bet > 100000) return message.channel.send("You can't bet more than 100,000.");
        else if (bet > userBal) return message.channel.send("You don't have enough money in your wallet for that!");

        const cards = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10];

        const deal = () => cards[client.randomInt(0, 12)];

        let userCards = [deal(), deal()];
        let dealerCards = [deal(), deal()];

        let stood = false;

        const getValue = card => values[cards.indexOf(card)];
    
        const addCards = cardArray => {
            const aceCount = cardArray.filter(card => card === "A").length;
            let sum = cardArray.reduce((p, c) => p + getValue(c), 0);

            for (let i = 0; i < aceCount; i++) {
                sum += sum + 10 <= 21 ? 10 : 0;
            }

            return sum;
        };

        while (addCards(userCards) === 21 || addCards(dealerCards) === 21) {
            userCards = [deal(), deal()];
            dealerCards = [deal(), deal()];
        }

        const checkScore = () => {
            const user = addCards(userCards);
            const dealer = addCards(dealerCards);

            if (user === 21) return { msg: "You win! You have 21!", win: true };
            else if (user <= 21 && userCards.length === 5) return { msg: "You win! You took 5 cards without going over 21!", win: true };
            else if (user > dealer && stood) return { msg: "You win! You have more than the dealer!", win: true };
            else if (dealer > 21) return { msg: "You win! Your opponent was busted!", win: true };

            else if (dealer === user && stood) return { msg: "It's a tie!", win: null };

            else if (user > 21) return { msg: "You lose, Busted! You went over 21!", win: false };
            else if (dealer > user && stood) return { msg: "You lose! You have less than your opponent!", win: false };
            else if (dealer <= 21 && dealerCards.length === 5) return { msg: "You lose! Your opponent took 5 cards without going over 21!", win: false };
            else if (dealer === 21) return { msg: "You lose! Your opponent has exactly 21!", win: false };

            else return;
        };

        const endGame = result => {
            const finalEmbed = new Discord.MessageEmbed()
                .setTitle(result.msg)
                .addFields([
                    { name: "Your Cards", value: `\`${userCards.join("`, `")}\`` },
                    { name: "Dealer's Cards", value:  `\`${dealerCards.join("`, `")}\`` }
                ])
                .setDescription(`Your total: ${addCards(userCards)}\nDealer's total: ${addCards(dealerCards)}`);
            if (result.win) {
                const winAmount = client.randomInt(bet * 0.1, bet * 2);
                finalEmbed.setFooter("nice win");
                finalEmbed.setColor("#05ed43");

                bal.set(message.author.id, userBal + winAmount);
                message.channel.send(`You won ${winAmount}!`, { embed: finalEmbed });
            } else if (result.win === null) {
                finalEmbed.setFooter("bruh a tie");
                finalEmbed.setColor("#ebcf00");

                message.channel.send("You lost no coins!", { embed: finalEmbed });
            } else {
                finalEmbed.setFooter("lol u lost");
                finalEmbed.setColor("#ff0000");

                bal.set(message.author.id, userBal - bet);
                message.channel.send("You lost your entire bet!", { embed: finalEmbed });
            }
        };

        const gameEmbed = () => {
            const embed = new Discord.MessageEmbed()
                .setTitle(`${message.author.username}'s blackjack game:`)
                .addFields([
                    { name: "Your Cards", value: `\`${userCards.join("`, `")}\`` },
                    { name: "Dealer's Cards", value:  `\`${dealerCards[0]}\`, \`?\`` }
                ])
                .setDescription(`Your total: ${addCards(userCards)}\nDealer's total: ?\n\nType \`h\` to hit, \`s\` to stand, or \`e\` to end.`);
            message.channel.send(embed);
        };

        const play = () => {
            gameEmbed();

            const filter = m => m.author.id === message.author.id && (m.content.toLowerCase().startsWith("h") || m.content.toLowerCase().startsWith("s") || m.content.toLowerCase().startsWith("e"));
            message.channel.awaitMessages(filter, { max: 1, time: 15000 }).then(collected => {
                if (collected.first().content.toLowerCase().startsWith("h")) {
                    userCards.push(deal());
                    
                    const result = checkScore();
                    result ? endGame(result) : play();
                } else if (collected.first().content.toLowerCase().startsWith("s")) {
                    stood = true;
                    
                    while (addCards(dealerCards) < 17) dealerCards.push(deal());

                    const result = checkScore();
                    endGame(result);
                } else return message.channel.send("You ended the game.");
            }).catch(() => message.channel.send("You didn't answer in the last 15 seconds, ending the game."));
        };

        play();
    }
};