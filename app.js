const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const passport = require('passport');
const api = require('./swagger/swagger')

const app = express(); 
// socket.io
const http = require('http').createServer(app);
// const { Server } = require('socket.io');
const io = require('socket.io')(http, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
// const io = new Server(http);
// Swagger
const { swaggerUi, specs } = require('./swagger/swagger');

dotenv.config();

const { connect, client } = require('./database/index');
const db = client.db('lastTeamProject');
const passportConfig = require('./passport');


// 라우터 가져오기
// const testRouter = require('./routes/index');
const mainRouter = require('./routes/index');
const userRouter = require('./routes/user');
const shopRouter = require('./routes/shop')
const communityRouter = require('./routes/community');
const vintageCommunityRouter = require('./routes/vintage');
const { ObjectId } = require('mongodb');
app.set('port', process.env.PORT || 8088);

 
passportConfig();
connect();
app.set('view engine', 'ejs'); 
app.set('views', path.join(__dirname, 'views')); 


app.use(cors({
  // origin: 'https://minton1000.netlify.app',
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use('/', express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json())
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
  cookie: {
    httpOnly: true,
    secure: false,
  },
  name: 'session-cookie'
}));

// passport 미들웨어 설정
app.use(passport.initialize());
app.use(passport.session());


// req.user 사용
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});


// 라우터를 미들웨어로 등록
app.use('/', mainRouter);
app.use('/user', userRouter);
app.use('/shop', shopRouter);
app.use('/community', communityRouter)
app.use('/vintage', vintageCommunityRouter);

// socket 테스트
app.get('/socket', async (req, res) => {
  // await db.collection('chat').find({});
  res.render('socket.ejs');
});

// socket
io.on('connection', (socket) => {
  console.log(io.httpServer._connections);
  // if (io.httpServer._connections !== 1) {
  // }

  // 해당 방에 join할 때 이전 채팅 값 불러오기, 채팅 칠 때마다 db에 저장(누가보냈는지), 시간...
  console.log('유저접속됨');
  socket.on('login', async (server) => {
    console.log('login'+server);
    socket.join(server);
    // io.emit('throwData', chatData);
  });
  

  // 실사용
  socket.on('answer', async (data) => {
    // msg, user2, id(로그인/답장유져), room(이제 의미없어졌는데 그냥 두 사람 묶어두는 배열)
    console.log(data);
    const findChat = await db.collection('chat').findOne({ room: [data.room, data.user2] });
    console.log('1파인드');
    if (!findChat) {
      const findChatDetail = await db.collection('chat').findOne({ room: [data.user2, data.room] });
      console.log('2파인드');
      if (!findChatDetail) {
        await db.collection('chat').insertOne({ room: [data.room, data.user2], user1: data.room, user2: data.user2 });
        console.log('방개설');
      }
    }
    console.log('이프아래');

    const listData = { user: data.id, msg: data.msg }
    const isUpdata = await db.collection('chat').updateOne({user1: data.id, user2: data.user2}, { $push: { chatList: {...listData} } });
    if (isUpdata.matchedCount === 0) {
      await db.collection('chat').updateOne({user1: data.user2, user2: data.id}, { $push: { chatList: {...listData} } });
    }

    // 보낸사람 위치가 다르니까 위에처럼 로그 찍어서 변동값이 없으면 배열 바꿔서 업데이트해주는 구조 추가해보자
    let resulte = await db.collection('chat').findOne({ room: [data.id, data.user2] });
    console.log('처음파인드'+resulte);
    if (!resulte?.user1) {
      resulte = await db.collection('chat').findOne({ room: [data.user2, data.id] });
      console.log('두번째파인드'+resulte);
    }
    console.log('이프문밑'+resulte.room);
    const lastChat = resulte.chatList.pop();
    console.log('라스트챗'+lastChat);

    // io.to(data.room).emit('throwData', chatData);
    // io.to(data.room).emit('throwChatData', toInChatroom);
    io.emit('update', data.msg);
    io.to(resulte.room).emit('updateChatDetail', lastChat);
  });

  socket.on('joinRoom', (room) => {
    console.log('joinRoom'+room);
    socket.join(room);
  })

  socket.on('leaveRoom', (room) => {
    console.log('leaveRoom'+room);
    socket.leave(room);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// 이거로해야 화면이 안겹침..
app.get('/getChatHeaderList', async (req, res) => {

  const loginUser = req.user.userId;
  console.log('채팅'+req.user?.userId);
  const resulte = await db.collection('chat').find({ room: loginUser.toString() }).toArray();
  console.log('resulte'+resulte);
  let chatData = resulte.map(room => {
    let lastChat = room.chatList.pop();
    console.log(lastChat);
    if (lastChat.user == loginUser) {
      return (
        {
          room: room.room,
          user: room.user2,
          msg: lastChat.msg
        }
      )
    } else {
      return (
        {
          room: room.room,
          user: room.user1,
          msg: lastChat.msg
        }
      )
    }
  });
  console.log(chatData);
  res.json({
    flag: true,
    chatData
  });
});

// app.get('/getChatting/:id', async (req, res) => {
app.get('/getChatting', async (req, res) => {
  // const id = req.params.id;
  const id = req.query.id;
  const me = req.user.userId;
  // const from = '아아'
  console.log('id'+id);
  console.log('me'+me);
  const resulte = await db.collection('chat').findOne({ room: [me, id] });
  console.log('처음리절트'+resulte?.room);
  if (!resulte?.user1) {
    const resulte2 = await db.collection('chat').findOne({ room: [id, me] });
    console.log('이프문'+resulte2);
    return res.json({
      message: '성공',
      resulte2
    });
  }
  console.log('이프밑에');
  res.json({
    message: '성공',
    resulte
  }) 
});


app.use((req, res, next) => {
  const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
  error.status = 404;
  next(error);
});

app.use((err, req, res, next) => {
  console.error(err)
  res.locals.message = err.message;
  res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

http.listen(app.get('port'), () => {
  console.log(app.get('port') + '번에서 서버 실행 중입니다.');
});