const express = require('express');
const { client } = require('../database');
const db = client.db('base');
const Basket = require("../schema/basket");
const router = express.Router();


//  shop C
router.get('/shop', async (req, res) => {
  db.collection('shop').updateOne({  })
  const result = await db.collection('shop').findOne({  }).toArray();
  res.send(result);
});

// shop R
router.get('/', (req, res) => {
	res.send('OK');
})

// shop U
router.post(`/shop`, async (req, res) => {
  const { postId } = req.body;
  console.log(postId);
  const count = await db.collection('shop').updateOne({ _id: new ObjectId(postId) }, {$inc: { view: 1 }});
  console.log('카운트',count);
  const result = await db.collection('shop').findOne({ _id: new ObjectId(postId) });
  console.log(result);
  res.json({
    flag: true,
    data: result,
  });
});

// shop D
router.post('/shop/delete', async (req, res) => {
  try {
    const result = await db.collection('shop').deleteOne({
      _id: new ObjectId(req.body.postId),
      writer: req.body.username
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

router.get('/basket', (req, res) => {
	res.send('장바구니')
})

// 장바구니 U

router.post("/products/:productId/basket", async (req, res) => {
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

router.delete("/products/:productId/basket", async (req, res) => {
  const { productId } = req.params;

  const isProductsInBasket = await Basket.find({ productId });
  if (isProductsInBasket.length > 0) {
    await Basket.deleteOne({ productId });
  }

  res.send({ result: "success" });
});


router.patch("/products/:productId/basket", async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  isBasket = await Basket.find({ productId });
  console.log(isBasket, quantity);
  if (isBasket.length) {
    await Basket.updateOne({ productId }, { $set: { quantity } });
  }

  res.send({ result: "success" });
})

module.exports = router;
