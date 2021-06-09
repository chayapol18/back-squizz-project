require('dotenv').config()
const cors = require('cors')
const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http, {
  cors: {
    origin: '*'
  }
})
const errorMiddleware = require('./middlewares/error')
const CollectionRoute = require('./routes/CollectionRoute')
const CreatorRoute = require('./routes/CreatorRoute')
const QuestionRoute = require('./routes/QuestionRoute')
const QuizRoute = require('./routes/QuizRoute')
const UserRoute = require('./routes/UserRoute')
const UserHistory = require('./routes/UserHistoryRoute')
const PointRecord = require('./routes/PointRecordRoute')
const e = require('cors')

// const { sequelize } = require('./models')

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use('/collection', CollectionRoute)
app.use('/creator', CreatorRoute)
app.use('/question', QuestionRoute)
app.use('/quiz', QuizRoute)
app.use('/user', UserRoute)
app.use('/userhistory', UserHistory)
app.use('/pointrecord', PointRecord)

app.use((req, res, next) => {
  res.status(404).json({ message: 'path not found on this server' })
})

app.use(errorMiddleware)

// sequelize.sync({ force: true}).then(() => console.log('DB sync'))

const rooms = [] // [ 'id1', 'id2']
const allPlayers = {}
const count = {}
const eachOptionCount = {}

//  'id1': {
//         players: [{id, name, score}, {id, name, score}]
//         quiz: {
//             [player.id]: {
//                 1: 1
//             }
//         }
//     },
//     'id2': {
//         players: ['eieiza']
//     }
// }

io.on('connection', (socket) => {
  console.log(socket.id, 'is now connect')

  socket.on('create_lobby', (pin) => {
    console.log('creator', pin, socket.id)
    rooms.push(pin)
    allPlayers[pin] = { players: {}, quiz: {} }
    socket.join(`play_room_${pin}`)
    //change status(database): inactive >> waiting
    console.log('rooms', rooms)
    console.log('all players', allPlayers)
  })

  // socket.on('hello', (arg) => {
  //   console.log('name', arg)
  // })

  socket.on('player_joined', (input) => {
    // const player = {
    //   id: socket.id,
    //   name: input.name,
    //   scores: 0
    // }
    // allPlayers[input.pin].players.push(player)

    const player = {
      name: input.name,
      scores: 0
    }

    allPlayers[input.pin].players[socket.id] = {
      ...allPlayers[input.pin].players[socket.id],
      name: input.name,
      scores: 0
    }

    allPlayers[input.pin].quiz[socket.id] = {}

    socket.join(`play_room_${input.pin}`)

    socket.to(`play_room_${input.pin}`).emit('show_players', player)
  })

  socket.on('start_quiz', (data) => {
    if (data.status === 'start') {
      socket.to(`play_room_${data.pin}`).emit('player_start', data.status)
      let countOptions = 0
      if (data.question.option1 !== null) countOptions = 1
      if (data.question.option2 !== null) countOptions = 2
      if (data.question.option3 !== null) countOptions = 3
      if (data.question.option4 !== null) countOptions = 4

      console.log('101', data.question)

      const question1 = {
        pin: data.pin,
        title: data.question.title,
        countOptions,
        status: data.status,
        questionId: data.question.id,
        answer: data.question.answer
      }

      eachOptionCount[data.question.id] = {}

      socket.to(`play_room_${data.pin}`).emit('question_to_player', question1)
    }
  })

  socket.on('change_question', (data) => {
    let countOptions = 0
    if (data.question.option1 !== null) countOptions = 1
    if (data.question.option2 !== null) countOptions = 2
    if (data.question.option3 !== null) countOptions = 3
    if (data.question.option4 !== null) countOptions = 4

    const question = {
      pin: data.pin,
      title: data.question.title,
      questionId: data.question.id,
      countOptions,
      answer: data.question.answer
    }

    eachOptionCount[question.questionId] = {}

    socket.to(`play_room_${data.pin}`).emit('new_question_to_player', question)
  })

  socket.on('answer_question', (data) => {
    const socketId = data.id
    const questionId = data.question.questionId
    const pin = data.question.pin

    if (eachOptionCount[questionId][data.option]) {
      eachOptionCount[questionId][data.option] += 1
    } else {
      eachOptionCount[questionId][data.option] = 1
    }

    socket
      .to(`play_room_${pin}`)
      .emit('count_option', eachOptionCount[questionId])

    if (data.question.answer === data.option) {
      allPlayers[pin].quiz[socketId] = {
        ...allPlayers[pin].quiz[socketId],
        [questionId]: { option: data.option, status: 'correct' }
      }

      allPlayers[pin].players[socketId].scores += 1
    } else {
      allPlayers[pin].quiz[socketId] = {
        ...allPlayers[pin].quiz[socketId],
        [questionId]: { option: data.option, status: 'incorrect' }
      }
    }

    console.log(allPlayers[pin].quiz)

    socket
      .to(`play_room_${pin}`)
      .emit('is_correct_answer', allPlayers[pin].quiz)

    if (allPlayers[pin].quiz[socketId][questionId]) {
      if (count[questionId]) {
        count[questionId] += 1
      } else {
        count[questionId] = 1
      }
    }

    socket.to(`play_room_${pin}`).emit('count_answer', count)
  })

  socket.on('question_time_out', (data) => {
    if (data.questionId)
      socket
        .to(`play_room_${data.pin}`)
        .emit('check_answer', allPlayers[data.pin].quiz)
  })

  socket.on('quiz_end', (data) => {
    socket.to(`play_room_${data.pin}`).emit('player_end_quiz', 'true')
  })

  socket.on('disconnect', () => {
    console.log(socket.id, 'disconnected')
  })
})

io.of('/').adapter.on('create-room', (room) => {
  console.log(`room ${room} was created`)
})

io.of('/').adapter.on('join-room', (room, id) => {
  console.log(`socket ${id} has joined room ${room}`)
})

const port = process.env.PORT
http.listen(port, () => console.log(`server is running on port ${port}`))
