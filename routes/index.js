const express = require('express');

const { client } = require('../database');
const db = client.db('board'); // board 데이터베이스에 연결

const router = express.Router();

// GET / 라우터
router.get('/', (req, res) => {
  res.render('main');
});






module.exports = router;