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
const vintageCommunityRouter = require('./routes/vintage')
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
  // 생각해보기 대화내용 db저장
  // 채팅방 입장 시 chat 컬렉션에 title: 입장한 유저(2명)의 닉네임 데이터 생성
  // 채팅할 때마다 

  // 해당 방에 join할 때 이전 채팅 값 불러오기, 채팅 칠 때마다 db에 저장(누가보냈는지), 시간...
  console.log('유저접속됨');
  
  socket.on('getIn', async (server) => {
    console.log(server);
    const chatData = await db.collection('chat').find({ user1: server.server, user2: server.id });
    const msg = server.id + '님이 입장하였습니다!'
    socket.join(server.server);
    const resulte = { chatData, msg };
    io.to(server.server).emit('open', resulte);
  });

  socket.on('getOut', (data) => {
    console.log(data);
    const msg = data.id + '님이 퇴장하였습니다!'
    socket.leave(data.server);
    io.to(data.server).emit('close', msg);
  });

  socket.on('userSend', async (data) => {
    console.log('유저가 보낸 메세지:', data.msg);
    console.log('유저아이디:', data.id);
    if (data.room !== data.id) {
      const findChat = await db.collection('chat').findOne({ user1: data.room, user2: data.id });
      console.log(findChat);
      if (!findChat) {
        await db.collection('chat').insertOne({ user1: data.room, user2: data.id });
        
      }
    }
    console.log('data.room'+data.room);
    console.log('data.id'+data.id);
    const findUser = await db.collection('chat').findOne({ user1: data.room, user2: data.id });
    console.log(findUser);
    if (findUser.user1 === data.room) {
      await db.collection('chat').updateOne({ user1: data.room, user2: data.id }, { $push: { user1Chat: data.msg } });
    } else if (findUser.user2 === data.id) {
      await db.collection('chat').updateOne({ user1: data.room, user2: data.id }, { $push: { user2Chat: data.msg } });
      
    }
    if (data.room) {
      io.to(data.room).emit('sendMsg', data);
    } else {
      // 전체메세지로 감
      io.emit('sendMsg', false);
    }
  });

  // fromHere
  socket.on('fromHere', async (data) => {
    const findChat = await db.collection('chat').findOne({ room: data.room, user1: data.room, user2: data.id });
    if (!findChat) {
      await db.collection('chat').insertOne({ room: data.room, user1: data.room, user2: data.id });
    }
    const listData = { user: data.id, msg: data.msg }
    await db.collection('chat').updateOne({ room: data.room, user2: data.id }, { $push: { chatList: { ...listData }}});
    const chat = await db.collection('chat').findOne({ room: data.room, user2: data.id });
    const from = chat.user2;
    // const lastChat = chat.user2chat.pop()
    // console.log(lastChat);
    const lastChat = chat.chatList.pop().msg
    console.log(lastChat);
    const chatData = { from, lastChat }
    const toInChatroom = { from, msg: data.msg }
    // socket.join((data.room+data.id));
    io.to(data.room).emit('messageBox', chatData);
    io.to(data.room).emit('inChatroom', toInChatroom);
  });
  
  socket.on('login', (server) => {
    console.log('login'+server);
    socket.join(server);
  });
});

app.get('/getChatHeaderList', async (req, res) => {
  const resulte = await db.collection('chat').find({ room: '디디' }).toArray();
  console.log(resulte);
  const chatData = resulte.map(room => {
    return (
      {
        user: room.user2, 
        msg: room.chatList.pop().msg
      }
    )
  });
  // const lastChat = resulte.map(room => room.chatList.pop().msg)
  console.log(chatData);

  res.json({
    flag: true,
    chatData
  });
});

app.get('/getChatting', async (req, res) => {
  const from = req.query.from;
  // const from = '아아'
  console.log('from'+from);
  const resulte = await db.collection('chat').find({ user2: from }).toArray();
  console.log(resulte);
  res.json({
    message: '성공',
    resulte
  })
})


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