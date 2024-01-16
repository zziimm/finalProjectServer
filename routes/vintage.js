const express = require('express');
const { ObjectId } = require('mongodb');

// S3
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');


const { client } = require('../database/index');
const db = client.db('lastTeamProject');

const router = express.Router();
// S3
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET
  },
  region: 'ap-northeast-2'
});

// S3 클라이언트
const upload = multer({
  storage: multerS3({
    s3,
    bucket: 'finaltp',
    key(req, file, cb) {
      cb(null, `original/${Date.now()}_${file.originalname}`)
    }
  }),
  limits: { fieldSize: 5 * 1024 * 1024 }
});


/**
 * @swagger
 * tags:
 *   name: 중고마켓 커뮤니티
 *   description: 중고마켓 커뮤니티 관련 작업
 */




// Fleamarket_List
router.get('/', async (req, res) => {
  try {
    const { dogType, category, area, price, view } = req.query.select;
    
    let posts = await db.collection('vincommunity').find({}).sort({ id: -1 }).toArray();
    
    if (dogType) {
      posts = posts.filter(post => { return post.dogType === dogType });
    }
    if (category) {
      posts = posts.filter(post => { return post.category === category });
    }
    if (area) {
      posts = posts.filter(post => { return post.area === area });
    }
    if (price === 'min') {
      posts = posts.sort((a, b) => { return a.price - b.price });
    } 
    if (price === 'max') {
      posts = posts.sort((a, b) => { return b.price - a.price });
    }
    if (view === 'min') {
      posts = posts.sort((a, b) => { return a.view - b.view });
    } 
    if (view === 'max') {
      posts = posts.sort((a, b) => { return b.view - a.view });
    } 
      
    res.json({
      flag: true,
      message: '데이터 불러오기 성공',
      posts
    });
  } catch (err) {
    console.error(err);
  }
});

// Fleamarket_List_Number
router.get('/number', async (req, res) => {
  try {
    const data = await db.collection('vincommunity').find({}).sort({ _id: -1 }).skip(0).limit(1).toArray();
    res.json({
      flag: true,
      id: Number(data[0].id)
    });
  } catch (err) {
    console.error(err);
  }
});

router.get('/detail/:postId', async (req, res) => {
  const postData = await db.collection('vincommunity').findOne({ id: Number(req.params.postId) });
  res.json({
    flag: true,
    message: '데이터 불러오기 성공(상세보기)',
    postData,
  });
});

// router.get('/detail/:postId', async (req, res) => {
//   const postId = req.params.postId
//   const posts = await db.collection('vincommunity').findOne({ _id: new ObjectId(postId)})

//   // 조회수
//   const views = await db.collection('vincommunity').updateOne({ _id: new ObjectId(postId) }, { $inc: { views: 1 }  })
//   // console.log(views);
//     res.render('vintage', { posts, views, user:req.user });

//   res.json({
//     flag: true,
//     message: '데이터 불러오기 성공(상세보기)',
//     posts,
//     views
//   })
// })

router.get('/insert', (req, res) => {
  res.render('insert.ejs');
});

// Fleamarket_Write
router.post('/insert', upload.array('img'), async (req, res) => {
  try {
    const { id, title, content, price, category, dogAge, dogWeight, dogType, author, authorId, area, date } = req.body;

    const imgUrl = req.files.map(url => url.location) || '';
    const imgKey = req.files.map(url => url.key) || '';

    const data = await db.collection('vincommunity').insertOne({
      id: Number(id), 
      title, 
      content,
      price: Number(price), 
      category, 
      imgUrl, 
      imgKey, 
      dogAge,
      dogType,
      dogWeight, 
      author, 
      authorId: new ObjectId(authorId),
      area,
      date,
      chat: [],
      view: 0, 
      user:req.user
    })
    res.json({
      flag: true,
      message: '데이터 저장 성공',
      data
      })
  } catch (err) {
    console.error(err);
  }
})

// Fleamarket_View
router.patch('/view/:id', async (req, res) => {
  try {
    await db.collection('vincommunity').updateOne({ _id: new ObjectId(req.params.id)}, { $inc: { view: 1 }});
    res.json({
      flag: true,
      message: '조회수 증가'
    });
  } catch (err) {
    console.error(err);
  }
});


// 수정 (이미지)_중고
router.post('/edit/:postId', upload.array('img'), async (req, res) => {
  const thisPost = await db.collection('vincommunity').findOne({ _id: req.params.postId });
  const { title, content, price, category } = req.body;
  const imgUrl = req.files?.location || ''
  const imgKey = req.files?.key || ''

  // aws에서 데이터 삭제
  const bucketParams = { Bucket: 'finaltp', Key: thisPost.imgKey };
  const run = async () => {
    try {
      const data = await s3.send(new DeleteObjectCommand(bucketParams))
      console.log('성공', data);
    } catch (err) {
      console.error(err);
    }
  };
  try {
    // 제목, 글, 가격, 카테고리, 이미지만 수정 가능
    await db.collection('vincommunity').updateOne({ _id: thisPost._id }, { $set: { title, content, price, category, imgUrl, imgKey } });
    run();
    res.json({
      flag: true,
      message: '데이터 수정 성공(커뮤니티_중고)'
    });
  } catch (err) {
    console.error(err);
  }
});

// 커뮤니티 삭제_중고
router.post('/delete', async (req, res) => {  // 커뮤니티 게시글 삭제
  try {
    const del = await db.collection('vincommunity').deleteOne({
      _id: new ObjectId(req.body.postId)
    });
    res.json({
      flag: true,
      message: '삭제 완료',
      del: del
    });
  } catch (err) {
    console.error(err);
  }
})

module.exports = router;
