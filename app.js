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
  origin: 'https://mymung.netlify.app',
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

// socket
io.on('connection', (socket) => {
  console.log(io.httpServer._connections);

  // 해당 방에 join할 때 이전 채팅 값 불러오기, 채팅 칠 때마다 db에 저장(누가보냈는지), 시간...
  console.log('유저접속됨');
  socket.on('login', async (server) => {
    console.log('login'+server);
    socket.join(server);
    // io.emit('throwData', chatData);
  });
  

  // 실사용
  // socket.on('answer', async (data) => {
  //   // msg, user2, id(로그인/답장유져), room(이제 의미없어졌는데 그냥 두 사람 묶어두는 배열)
  //   console.log(data);
  //   const findChat = await db.collection('chat').findOne({ room: [data.room, data.user2] });
  //   if (!findChat) {
  //     const findChatDetail = await db.collection('chat').findOne({ room: [data.user2, data.room] });
  //     if (!findChatDetail) {
  //       await db.collection('chat').insertOne({ room: [data.room, data.user2], user1: data.room, user2: data.user2 });
  //     }
  //   }

  //   const listData = { user: data.id, msg: data.msg }
  //   const isUpdata = await db.collection('chat').updateOne({user1: data.id, user2: data.user2}, { $push: { chatList: {...listData} } });
  //   if (isUpdata.matchedCount === 0) {
  //     await db.collection('chat').updateOne({user1: data.user2, user2: data.id}, { $push: { chatList: {...listData} } });
  //   }

  //   let resulte = await db.collection('chat').findOne({ room: [data.id, data.user2] });
  //   if (!resulte?.user1) {
  //     resulte = await db.collection('chat').findOne({ room: [data.user2, data.id] });
  //   }
  //   const lastChat = resulte.chatList.pop();
  //   const lastChatRoom = resulte.room;
  //   const chatDataInRoom = { lastChat, lastChatRoom }

  //   io.emit('update', data.msg);
  //   io.to(resulte.room).emit('updateChatDetail', chatDataInRoom);
  // });

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

app.get('/getChatHeaderList', async (req, res) => {
  try {
    if (!req.user) {
      throw new Error('로그인을 해주세요!');
    }
    const loginUser = req.user.userId;
    const resulte = await db.collection('chat').find({ room: loginUser.toString() }).toArray();
    console.log('resulte'+resulte);
    let chatData = resulte.map(room => {
      let lastChat = room.chatList.pop();
      console.log(lastChat);
      if (room.user1 == loginUser) {
        return (
          {
            room: room.room,
            user: room.user2,
            msg: lastChat.msg,
            chatTime: lastChat.chatTime,
            lastChatUser: lastChat.user
          }
        )
      } else {
        return (
          {
            room: room.room,
            user: room.user1,
            msg: lastChat.msg,
            chatTime: lastChat.chatTime,
            lastChatUser: lastChat.user
          }
        )
      }
    });
    console.log(chatData);
    res.json({
      flag: true,
      chatData
    });
    
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: err.message
    });
  }
});

// app.get('/getChatting/:id', async (req, res) => {
app.get('/getChatting', async (req, res) => {
  try {
    const id = req.query.id;
    const me = req.user.userId;
    console.log('id'+id);
    console.log('me'+me);
    const resulte = await db.collection('chat').findOne({ room: [me, id] });
    if (!resulte?.user1) {
      const resulte2 = await db.collection('chat').findOne({ room: [id, me] });
      return res.json({
        message: '성공',
        resulte2
      });
    }
    res.json({
      message: '성공',
      resulte
    }) 
    
  } catch (err) {
    console.error(err);
    res.json({
      message: '불러오기 실패'
    });
  }
});


// 채팅중 충돌 가능성 있음
app.post(`/inChating`, async (req, res) => {
  try {
    const room = req.body.data.room;
    const id = req.body.data.id;
    const user2 = req.body.data.user2;
    const msg = req.body.data.msg;
    const chatTime = new Date();
    if (!user2) {
      throw new Error('상대방을 찾을 수 없습니다!');
    }
    const loginUser = req.user.userId;
    const findChat = await db.collection('chat').findOne({ room: [room, user2] });
    if (!findChat) {
      const findChatDetail = await db.collection('chat').findOne({ room: [user2, room] });
      if (!findChatDetail) {
        await db.collection('chat').insertOne({ room: [room, user2], user1: room, user2: user2 });
      }
    }
  
    const listData = { user: id, msg: msg, chatTime }
    const isUpdate = await db.collection('chat').updateOne({user1: id, user2: user2}, { $push: { chatList: {...listData} } });
    if (isUpdate.matchedCount === 0) {
      await db.collection('chat').updateOne({user1: user2, user2: id}, { $push: { chatList: {...listData} } });
    }
  
    let resulte = await db.collection('chat').findOne({ room: [id, user2] });
    if (!resulte?.user1) {
      resulte = await db.collection('chat').findOne({ room: [user2, id] });
    }
    const lastChat = resulte.chatList.pop();
    const lastChatRoom = resulte.room;
    const chatData = { lastChat, lastChatRoom }
    
  
    io.emit('update', msg);
    console.log('룸'+lastChatRoom);
    console.log('로그인유저'+loginUser.toString());
    console.log('유저2'+user2.toString());
    if (lastChatRoom.find(user => user == loginUser.toString()) && lastChatRoom.find(user => user == user2.toString())) {
      io.to(resulte.room).emit('updateChatDetail', chatData);
      console.log('이프실행');
    }
    res.json({
      flag: true,
      message: '성공'
    });
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: err.message
    });
  }
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