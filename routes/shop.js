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
const e = require('express');


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


// 쇼핑몰아이템 삽입
router.post('/insertShopItem', upload.single('img'), async (req, res) => {
  // const userId = req.user._id;
  // const inputdata = req.body.inputdata;
  const brand = req.body.brand;
  const title = req.body.title;
  const price = req.body.price;
  const age = req.body.age;
  const size = req.body.size;
  const tag = req.body.tag;
  const imgUrl = req.file?.location || '';
  // imgUrl 뒤에 키값이 있으니까 
  // 앞의 값은 env 에 저장해서 꺼내쓰고 키값만 imgUrl에 저장해도되고
  // 두개를 따로 나눠서 저장해도되고 선택!
  const imgKey = req.file?.key || '';

try {
  await db.collection('shop').insertOne({ brand, title, price, age, size, tag, imgUrl, imgKey });
  res.json({
    flag: true,
    message: '데이터 저장 성공(쇼핑)'
  });
} catch (err) {
  console.error(err);
}
});
// 수정 (이미지)
router.post('/brag/editShopItem/:itemId', upload.single('img'), async (req, res) => {
  const thisItem = await db.collection('shop').findOne({ _id: req.params.itemId });
  console.log(req.file);
  const brand = req.body.brand;
  const title = req.body.title;
  const price = req.body.price;
  const age = req.body.age;
  const size = req.body.size;
  const tag = req.body.tag;
  const imgUrl = req.file?.location || '';
  const imgKey = req.file?.key || '';

  // aws에서 데이터 삭제
  // const bucketParams = { Bucket: 'finaltp', Key: 'original/1703139078070_feed_01.jpg' };
  const bucketParams = { Bucket: 'finaltp', Key: thisItem.imgKey };
  const run = async () => {
    try {
      const data = await s3.send(new DeleteObjectCommand(bucketParams))
      console.log('성공', data);
    } catch (err) {
      console.error(err);
    }
  }
  try {
    // await db.collection('commubuty').insertOne({...inputdata, userId, imgUrl});
    await db.collection('shop').updateOne({ _id: thisItem._id }, { $set: { brand, title, price, age, size, tag, imgUrl, imgKey } });
    run();
    res.json({
      flag: true,
      message: '데이터 수정 성공(쇼핑)'
    });
  } catch (err) {
    console.error(err);
  }
});

router.get('/shop', async (req, res) => {
  let posts;
  if (req.query.nextId) {
    posts = await db.collection('shop').find({ _id: { $gt: new ObjectId(req.query.nextId) } }).limit(8).toArray();
  } else {
    posts = await db.collection('shop').find({}).limit(8).toArray();
  }
})

// 상품정보 불러오기(초기 8개, 더보기 시 8개 추가)
// 상품 태그별로 보여주기 feed
router.get('/shop/feed', async (req, res) => {
  let posts;
  if (req.query.nextId) {
    posts = await db.collection('shop').find({ _id: { $gt: new ObjectId(req.query.nextId) }, tag: 'feed' }).limit(8).toArray();
  } else {
    posts = await db.collection('shop').find({ tag: 'feed' }).limit(8).toArray();
  }
  console.log(posts);
  res.render('write.ejs', { posts })
  res.json({
    flag: true,
    message: '성공적으로 상품을 가져왔습니다.(feed)',
    posts
  });
});

// 장바구니 추가
router.post('plusCart', async (req, res) => {
  const title = req.body.title;
  const price = req.body.price;
  const postId = req.body.postId;
  const count = req.body.count;
  try {
    const user = req.user_id;
    const cart = await db.collection('cart').insertOne({ title, price, postId, count, user });
    res.json({
      flag: true,
      message: '장바구니 추가 완료',
      cart
    })
  } catch (err) {
    console.error(err);
  }
})

// 수량 1개씩 추가 버튼
router.post('/plusCount', async (req, res) => {
  const postId = req.body.postId;
  const user = req.user._id;
  try {
    await db.collection('cart').updateOne({ postId, user }, { $inc: { count: 1 } })
  } catch (err) {
    console.error(err);
  }
});
router.post('/minusCount', async (req, res) => {
  const postId = req.body.postId;
  const user = req.user._id;
  try {
    await db.collection('cart').updateOne({ postId, user }, { $inc: { count: -1 }});
  } catch (err) {
    console.error(err);
  }
});



router.get(`/qqq`, async (req, res) => {
  const count = await db.collection('shop').updateOne({ _id: new ObjectId('658b7cb691630cf88f029506') }, {$inc: { view: 1 }});
  console.log('카운트',count);
  const result = await db.collection('shop').findOne({ _id: new ObjectId('658b7cb691630cf88f029506') });
  console.log(result);
  res.json({
    flag: true,
    data: result,
  });
});


router.post('/delete', async (req, res) => {
  try {
    const result = await db.collection('shop').deleteOne({
      _id: new ObjectId('6583a5a6f703dc24018568c1'),
    })
    if (result.deletedCount === 0) {
      throw new Error('삭제 실패');
    }
    res.json({
      flag: true,
      message: '삭제 성공'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      falg: false,
      message: err.message
    })
  }
})


// 장바구니 C


router.get('/w', (req, res) => {
  try {
    const test = db.collection('basket').insertOne({
      userid: 10,
      amount: 2,
      item: 'box'
    })
    res.json({
      flag: true,
      message: '성공',
      test
    })
  } catch (err) {
    console.error(err);
  }
})




// 장바구니 R

router.get('/baskets', (req, res) => {
	res.send('장바구니')
})

// 장바구니 U

router.post("/basket", async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  const isBasket = await db.collection('basket').find({ productId });
  console.log(isBasket, quantity);
  if (isBasket.length) {
    await db.collection('basket').updateOne({ productId }, { $set: { quantity } });
  }
  // res.send({ result: "success" });
  res.json({
    flag: true,
    message: '성공',
    isBasket
})
});

// 장바구니 D

router.post('/deleted', (req, res) => {
  db.collection('basket').deleteOne({ 
    _id : new ObjectId('6583e1222c062a33effd8be2')
  })
  res.json({
    falg: true,
    message: '성공'
  })
})

router.get('/basketss', async (req, res) => {
  const basket = db.collection('basket').find({}).toArray();
  res.json({
    flag: true,
    message: '성공',
    basket
  })
})


module.exports = router;
