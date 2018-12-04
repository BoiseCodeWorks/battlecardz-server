var express = require('express')
var bp = require('body-parser')
var cors = require('cors')

var port = process.env.PORT || 9080
var server = express()

server.use(cors())
server.use(bp.json())
server.use(bp.urlencoded({ extended: true }))

var cards = require('./cards')

server.post('/api/games', cards.start)
server.get('/api/games', cards.getGames)
server.get('/api/games/:id', cards.get)
server.put('/api/games/:id', cards.play)
server.delete('/api/games/:id', cards.deleteGame)


server.listen(port, () => {
    console.log('running on port: ', port)
})
