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


router.get('/q', (req, res) => {
  try {
    const test = db.collection('shop').insertOne({
      item: '간식',
      price: 5000,
      imgUrl: 'www',
      title: '테스트',
      text: '테스트',
      age: 10,
      size: 'big'
    })
    res.send('ok')
  } catch (err) {
    console.error(err);
  }
})


//  shop C
router.get('/qq', async (req, res) => {
  const result = await db.collection('shop').find({ }).toArray();
  res.send(result);
});

// shop R
router.get('/', (req, res) => {
	res.send('OK');
})

// shop U
// router.post(`/shop`, async (req, res) => {
//   const { postId } = req.body;
//   console.log(postId);
//   const count = await db.collection('shop').updateOne({ _id: new ObjectId(postId) }, {$inc: { view: 1 }});
//   console.log('카운트',count);
//   const result = await db.collection('shop').findOne({ _id: new ObjectId(postId) });
//   console.log(result);
//   res.json({
//     flag: true,
//     data: result,
//   });
// });


router.get(`/qqq`, async (req, res) => {
  // const { 123 } = req.body;
  const abc = '6583a5a6f703dc24018568c1'
  console.log(123);
  const count = await db.collection('shop').updateOne({ _id: new ObjectId('6583a5a6f703dc24018568c1') }, {$inc: { view: 1 }});
  console.log('카운트',count);
  const result = await db.collection('shop').findOne({ _id: new ObjectId('6583a5a6f703dc24018568c1') });
  console.log(result);
  res.json({
    flag: true,
    data: result,
  });
});

// shop D
// router.post('/delete', async (req, res) => {
//   try {
//     const result = await db.collection('shop').deleteOne({
//       _id: new ObjectId(req.body.postId),
//       writer: req.body.username
//     })
//     if (result.deletedCount === 0) {
//       throw new Error('삭제 실패');
//     }
//     res.json({
//       flag: true, 
//       message: '삭제 성공'
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       flag: false,
//       message: err.message
//     });
//   }
// });

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
      flag: false,
      message: err.message
    });
  }
});


// 장바구니 C


router.get('/w', (req, res) => {
  try {
    const test = db.collection('basket').insertOne({
      userid: 10,
      amount: 2,
      item: 'box'
    })
    res.send('ok')
  } catch (err) {
    console.error(err);
  }
})

router.get("/basket", async (req, res) => {
  const basket = await   basket.find({});
  const productId = basket.map(basket => basket.productId);

  productsInCart = await Products.find()
    .where("productId")
    .in(productId);


  concatCart = basket.map(c => {
    for (let i = 0; i < productsInCart.length; i++) {
      if (productsInCart[i].productId == c.productId) {
        console.log(c.quantity, productsInCart[i]);
        return { quantity: c.quantity, products: productsInCart[i] };
      }
    }
  });

  res.json({
    basket: concatCart
  });
});

// 장바구니 R

router.get('/baskets', (req, res) => {
	res.send('장바구니')
})

// 장바구니 U

router.post("/:productId/basket", async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  isBasket = await Basket.find({ productId });
  console.log(isBasket, quantity);
  if (isBasket.length) {
    await Basket.updateOne({ productId }, { $set: { quantity } });
  } else {
    await Basket.create({ productId: productId, quantity: quantity });
  }
  res.send({ result: "success" });
});




// 장바구니 D

router.delete("/:productId/basket", async (req, res) => {
  const { productId } = req.params;

  const isProductsInBasket = await Basket.find({ productId });
  if (isProductsInBasket.length > 0) {
    await Basket.deleteOne({ productId });
  }

  res.send({ result: "success" });
});


// router.patch("/:productId/basket", async (req, res) => {
//   const { productId } = req.params;
//   const { quantity } = req.body;

//   isBasket = await Basket.find({ productId });
//   console.log(isBasket, quantity);
//   if (isBasket.length) {
//     await Basket.updateOne({ productId }, { $set: { quantity } });
//   }

//   res.send({ result: "success" });
// })

router.patch("/basketq", async (req, res) => {
  // const { productId } = req.params;
  // const { quantity } = req.body;
  const productId = 10
  const quantity = 'box'

  isBasket = await db.collection('basket').find({ productId });
  console.log(isBasket, quantity);
  if (isBasket.length) {
    await db.collection(basket).updateOne({ productId }, { $set: { quantity } });
  }

  res.send({ result: "success" });
})

module.exports = router;
