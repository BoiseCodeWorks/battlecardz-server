//@ts-check
var uuid = require('uuid')
var Datastore = require('nedb');
var dbgames = new Datastore({ filename: 'games.db', autoload: true });
var first = ['Orion', 'Zendar', 'Morton', 'Lyle', 'Richen', 'Abby', 'Bolton', 'Barry', 'Brenda', 'Cindy',
    'Ciron', 'Corden', 'Damon', 'Dendial', 'Exor', 'Ender', 'Friton', 'Fox', 'Gormen', 'Greg',
    'Halafax', 'Handor', 'Harriet', 'Igon', 'Isabella', 'Jerry', 'Jelix', 'Kymira', 'Killdor',
    'Lancelot', 'Lyra', 'Mandy', 'Moraine', 'Osiris', 'Panthax', 'Rictor', 'Ramira', 'Sanda',
    'Soria', 'Tamoro', 'Tendar', 'Velix', 'Wendy', 'Test']

var last = ['the Ambivalent', 'the Abhorent', 'of Andelin', 'the Brave', 'the Bold', 'the Coward',
    'the Courageous', 'the Dark One', 'of Doom', 'the Ender', 'the Excellent', 'from Fire',
    'Fear', 'the Frightful', 'the Great', 'Hellfire', 'the Horrible', 'of Indigo',
    'the Jerk', 'the King', 'the Killer', 'in Love', 'the Liar', 'the Magnificent', 'Nobody',
    'the Offender', 'of Parties', 'the Queen', 'the Righteous', 'of Smiles', 'del Sol',
    'the TestCard', 'Time Theif', 'the Usurper']

var games = {}

function startGame(gameConfig) {
    var game = new Game(gameConfig.playerName, gameConfig.opponents, gameConfig.set)
    dbgames.insert(game)
    return game
}

function getGame(id, cb) {
    dbgames.findOne({ id: id }, (err, game) => {
        if (err) { return cb(null, err) }
        if (!game) { return cb(null, { error: 'Invalid Game Id' }) }
        game.__proto__ = Game.prototype
        cb(game)
    })
}

class Game {
    constructor(playerName, opponents, set) {
        try {
            this.id = uuid.v4();
            this.set = set || 4;
            this.opponent = this.createPlayer(randomName());
            this.player = this.createPlayer(playerName);
            this.dead = [];
            this.over = false;
            this.winner = '';
            games[this.id] = this;
        }
        catch (e) {
            console.log(e);
        }
    }
    createPlayer(name) {
        return {
            id: uuid.v4(),
            name: name || randomName(),
            hand: getCards(5, this.set),
            remainingCards: 5,
            dead: false,
            deadCards: []
        };
    }
    findCard(prop, cardId) {
        return this[prop].hand.find(c => c.id == cardId)
    }
    handleAttack(card1, card2) {
        if (!card1 || !card2) {
            throw new Error("Invalid Card Ids")
        }
        card1.health -= card2.attack >= card1.defense ? (card2.attack - card1.defense) : 0;
        card2.health -= card1.attack >= card2.defense ? (card1.attack - card2.defense) : 0;
        card1.visible = true;
        card2.visible = true;
        if (card2.health <= 0) {
            card2.dead = true;
            card2.health = 0;
        }
        if (card1.health <= 0) {
            card1.dead = true;
            card1.health = 0;
        }
    }

    updatePlayer(p) {
        p.deadCards = [...p.hand.filter(c => c.dead), ...p.deadCards];
        p.hand = p.hand.filter(c => !c.dead);
        if (p.hand.length < 5 && p.remainingCards > 0) {
            p.hand.push(new Card(this.set));
            p.remainingCards--;
        }
        if (p.hand.length == 0) {
            p.dead = true;
        }
    }

    updateState() {
        this.updatePlayer(this.opponent)
        this.updatePlayer(this.player)

        if (this.player.dead || this.opponent.dead) {
            this.over = true
            this.winner = this.player.dead ? this.opponent.name : this.player.name
            if (this.player.dead && this.opponent.dead) {
                this.winner = "TIE"
            }
        }

    }
    play(payload) {
        this.handleAttack(this.findCard("player", payload.playerCardId), this.findCard("opponent", payload.opponentCardId));
        this.updateState();
        dbgames.update({ id: this.id }, this);
    }
}

function rand(min, max) {
    return Math.floor(Math.random() * max) + min
}

function randomName() {
    var f = first[rand(0, first.length)]
    var l = last[rand(0, last.length)]

    return `${f} ${l}`
}

function randomImg(id, set) {
    return `https://robohash.org/${id}?set=set${set || 4}`
}

class Card {
    constructor(set) {
        this.name = randomName();
        this.attack = rand(1, 4);
        this.health = rand(2, 10);
        this.defense = rand(0, 2);
        this.id = uuid.v4();
        this.img = randomImg(this.id, set);
        this.dead = false;
        this.visible = false;
    }
}

function getCards(n, set) {
    var out = []
    while (out.length < n) {
        out.push(new Card(set))
    }
    return out
}

function play(req, res, next) {
    var game = getGame(req.params.id, game => {
        if (!game || game.over) {
            return res.send({ message: 'This game is over', data: game })
        }
        try {
            game.play(req.body)
            res.send({ message: 'ready', game })
        } catch (e) {
            console.log(e)
            res.status(400).send({ error: e })
        }
    })
}

function start(req, res, next) {
    try {
        var gameConfig = req.body.gameConfig
        if (!gameConfig) {
            gameConfig = {
                playerName: req.body.playerName || 'My Name is Nobody',
                set: req.body.set || 4
            }
        }
        var game = startGame(gameConfig)
        res.send(game)
    } catch (e) {
        res.status(400).send({ error: e })
    }
}

function get(req, res, next) {
    var game = getGame(req.params.id, game => {
        game ? res.send({ message: 'Game Retrieved', data: game }) : res.status(400).send({ error: 'Unable to find Game' })
    })
}

function deleteGame(req, res, next) {
    dbgames.remove({ id: req.params.id })
    res.send({ message: 'GAME DELORTED' })
}

function getGames(req, res, next) {
    // @ts-ignore
    dbgames.find({}, (err, games) => {
        res.send(games)
    })
}

module.exports = {
    start,
    getGames,
    get,
    play,
    deleteGame
}