const express = require('express');
const { client } = require('../database');
const db = client.db('lastTeamProject');
const { ObjectId } = require('mongodb');
const router = express.Router();

// S3
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');


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


// 상품정보 불러오기 (전체)(초기 8개, 더보기 시 8개 추가)
router.get('/', async (req, res) => {
  let posts;
  try {
    if (req.query.nextId) {
      console.log('실행');
      posts = await db.collection('shop').find({ _id: { $gt: new ObjectId(req.query.nextId) } }).limit(8).toArray();
    } else {
      posts = await db.collection('shop').find({}).limit(8).toArray();
    }
    res.json({
      flag: true,
      message: '성공적으로 상품을 가져왔습니다.',
      posts,
    });
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: '상품 불러오기 실패'
    });
  }
});

// 상품정보 불러오기(초기 8개, 더보기 시 8개 추가)
// 상품 태그별로 보여주기 feed
// 현재 feed 뿐 만들어진 더미 없음 (이미지 없는 이슈..)
router.get('/category/:cate', async (req, res) => {
  const cate = req.params.cate;
  let posts;
  if (req.query.nextId) {
    posts = await db.collection('shop').find({ _id: { $gt: new ObjectId(req.query.nextId) }, tag: cate }).limit(8).toArray();
  } else {
    posts = await db.collection('shop').find({ tag: cate }).limit(8).toArray();
  }
  res.json({
    flag: true,
    message: '성공적으로 상품을 가져왔습니다.(feed)',
    posts,
  });
});

// 장바구니 불러오기
router.post('/getCart', async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await db.collection('cart').findOne({ user: userId });
    res.json({
      flag: true,
      message: '장바구니 불러오기 성공',
      result
    });
  } catch (err) {
    console.error(err);
    res.json({
      flag:false,
      message: '장바구니 불러오기 실패',
    })
  }
});

// 장바구니 추가(로그인 한 사람)
router.post('/plusCart', async (req, res) => {
  const title = req.body.title;
  const price = req.body.price;
  const count = req.body.productCount;
  const postId = req.body.postId;
  try {
    const user = req.user._id;
    const hasCart = await db.collection('cart').findOne({ user });
    if (hasCart) {
      const hasItem = hasCart.list.filter(item => item.postId == postId);
      if (hasItem.length > 0) {
        // 이미 장바구니에 넣은 물건을 또 넣을 때
        const nowCount = hasItem[0].count;
        await db.collection('cart').updateOne({ user, list: { $elemMatch: { postId: new ObjectId(postId) } } }, { $set: { 'list.$.count': nowCount + count } });
      } else {
        // 장바구니는 있는데 없던 물건일 때
        const newArr = [...hasCart.list, {title, price, count, postId: new ObjectId(postId)}];
        await db.collection('cart').updateOne({user}, {$set:{list: newArr}});
      }
    } else {
      // 장바구니 첫 생성
      await db.collection('cart').insertOne({ user, list: [{ title, price, count, postId: new ObjectId(postId) }] });
    }
    res.json({
      flag: true,
      message: '장바구니 추가 완료'
    });
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: '장바구니 추가 실패',
    })
  }
});

// 상세화면에서 구매 후 구매 목록에 추가
router.post('/purchaseAdd', async (req, res) => {
  try {
    let postId = req.body.postId;
    postId = new ObjectId(postId);
    const title = req.body.title;
    const price = req.body.price;
    const count = req.body.productCount;
    const user = req.user._id;
    const date = new Date();
    const list = [{title, price, count, postId}];
    await db.collection('purchase').insertOne({ user, date, list });
    res.json({
      flag: true,
      message: '구매 목록 추가 성공',
    });
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: '구매 목록 추가 실패'
    });
  }
});

// 장바구니에서 삭제
router.post('/deleteCart', async (req, res) => {
  try {
    let postId = req.body.postId;
    const user = req.user._id;
    await db.collection('cart').updateOne({ user, list: { $elemMatch: {postId: new ObjectId(postId)}}}, {
      $pull: { list: {postId: new ObjectId(postId)} }
    });
    const result = await db.collection('cart').findOne({ user });
    res.json({
      flag: true,
      message: '삭제 성공',
      result
    });
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: '삭제 실패'
    });
  }
});

// 수량 1개씩 추가 버튼
router.post('/plusCount', async (req, res) => {
  const postId = req.body.postId;
  try {
    const user = req.user._id;
    const cart = await db.collection('cart').findOne({ user });
    const element = cart.list.filter(item => item.postId == postId);
    const nowCount = element[0].count;
    await db.collection('cart').updateOne({ user, list: { $elemMatch: {postId: new ObjectId(postId)} }}, {$set:{'list.$.count' :  nowCount+1}});
    const result = await db.collection('cart').findOne({ user });
    res.json({
      flag: true,
      message: '카운트 +1 성공',
      result
    });
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: err.message
    });
  }
});

// 수량 1개씩 다운 버튼
router.post('/minusCount', async (req, res) => {
  const postId = req.body.postId;
  try {
    const user = req.user._id;
    const cart = await db.collection('cart').findOne({ user });
    const element = cart.list.filter(item => item.postId == postId);
    const nowCount = element[0].count;
    await db.collection('cart').updateOne({ user, list: { $elemMatch: {postId: new ObjectId(postId)} }}, {$set:{'list.$.count' :  nowCount-1}});
    const result = await db.collection('cart').findOne({ user });
    res.json({
      flag: true,
      message: '카운트 -1 성공',
      result
    });
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: err.message
    });
  }
});

// 장바구니에서 구매 후 구매 목록에 추가, 장바구니 비우기
router.get('/purchaseAdds', async (req, res) => {
  try {
    const userId = req.user._id;
    const cartList = await db.collection('cart').findOne({user: userId});
    const { user, list } = cartList;
    const date = new Date();
    await db.collection('purchase').insertOne({ user, list, date });
    await db.collection('cart').deleteOne({user: new ObjectId(userId)});
    res.json({
      flag: true,
      message: '구매 완료 및 장바구니 삭제'
    })
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: '구매 실패'
    })
  }
});

// 상품 상세페이지 가져오기
router.get('/detail/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;
    const itemDetail = await db.collection('shop').findOne({ _id: new ObjectId(postId) });
    res.json({
      flag: true,
      message: '상세정보 불러오기 성공',
      itemDetail,
    });
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: '상세정보 불러오기 실패'
    });
  }
});

// 상품 상세페이지_리뷰 가져오기
router.get('/review/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;
    const itemReview = await db.collection('review').find({ postId: postId }).toArray();
    res.json({
      flag: true,
      message: '리뷰 불러오기 성공',
      itemReview
    });
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: '리뷰 불러오기 실패'
    });
  }
});

// 상품 상세페이지_리뷰 작성하기
router.post('/reviewInsert/:postId', upload.single('img'), async (req, res) => {
  try {
    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    const date = req.body.date;
    const imgUrl = req.file?.location || 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/300px-No_image_available.svg.png';
    const star = req.body.star;
    const imgKey = req.file?.key || 'NoImage';
    const user = req.user._id;

    await db.collection('review').insertOne({ title, star, content, date, postId, imgUrl, imgKey, user });
    const reviweList = await db.collection('review').find({ postId: postId }).toArray();
    let sum = 0;
    reviweList.map((item) => { sum = Number(item.star) + sum })
    const length = reviweList.length;
    const rate = (sum / length).toFixed(1);
    await db.collection('shop').updateOne({ _id: new ObjectId(postId) }, { $set: { rate } });

    res.json({
      flag: true,
      message: '리뷰 등록 완료'
    });
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: '리뷰 등록 실패'
    });
  };
});

// 본인의 리뷰 삭제
router.post('/reviewDelete', async (req, res) => {
  const { _id, postId } = req.body;
  try {
    await db.collection('review').deleteOne({
      _id: new ObjectId(_id)
    })
    const reviweList = await db.collection('review').find({ postId: postId }).toArray();
    let sum = 0;
    reviweList.map((item) => { sum = Number(item.star) + sum })
    const length = reviweList.length;
    const rate = (sum / length).toFixed(1);
    await db.collection('shop').updateOne({ _id: new ObjectId(postId) }, { $set: { rate } });

    res.json({
      flag: true,
      message: '리뷰 삭제 완료'
    })
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: '리뷰 삭제 실패'
    })
  }
});

// 리뷰 전체 삭제
router.get('/reviewDeleteAll', async (req, res) => {
  try {
    await db.collection('review').deleteMany({});
  } catch (err) {
    console.error(err);
  }
  res.json({
    flag: true,    
  })
});

// 상품 상세페이지_Q&A 가져오기
router.get('/qna/:postId', async (req, res) => {
  try {
    const postId = req.params.postId;
    const itemQna = await db.collection('qna').find({ postId: postId }).toArray();
    res.json({
      flag: true,
      message: 'Q&N 불러오기 성공',
      itemQna,
    });
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: 'Q&N 불러오기 실패',
      itemQna,
    });
  }
});

// 상품 Q&A 작성하기
router.post('/qna/:postId', async (req, res) => {
  const postId = req.params.postId;
  const title = req.body.title;
  const content = req.body.content;
  const date = req.body.date;
  try {
    const user = req.user._id;
    const userName = req.user.signUserNicname;
    await db.collection('qna').insertOne({ date, title, content, postId, user, userName, status: '답변대기' });
    res.json({
      flag: true,
      message: 'Q&A 등록 완료'
    });
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: 'Q&A 등록 실패'
    });
  }
});

// 상품 Q&A 답변하기
router.patch('/qnaComment/:qnaPostId', async (req, res) => {
  try {
    const qnaPostId = req.params.qnaPostId;
    const answer = req.body.answer;
    await db.collection('qna').updateOne({ _id: new ObjectId(qnaPostId) }, { $set: { answer } });
    await db.collection('qna').updateOne({ _id: new ObjectId(qnaPostId) }, { $set: { status: '답변완료' } });
    res.json({
      flag: true,
      message: 'Q&N 답변 등록 완료'
    });
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: 'Q&A 답변 등록 실패'
    });
  }
});

// 구매 완료된 목록 주기
router.get('/purchase', async (req, res) => {
  try {
    const id = req.user._id;
    const lists = await db.collection('purchase').find({ user: id }).toArray();
    res.json({
      flag: true,
      message: '구매 목록 불러오기 성공',
      list: lists
    });
  } catch (err) {
    console.error(err);
    res.json({
      flag: false,
      message: '구매 목록 불러오기 실패'
    });
  }
});



module.exports = router;