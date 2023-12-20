const express = require('express')
const passport = require('passport')
const { client } = require('../database/index');
const db = client.db('lastTeamProject');

const router = express.Router();

router.get('/', async (req, res) => {
  const result = await db.collection('userInfo').find({}).toArray();
  res.json({
    flag: true,
    message: '불러오기 성공',
    data: result
  })
})



router.post('/login', (req, res, next) => {
  passport.authenticate('local', (authError, user, info) => {
    if (authError) {
      return res.status(500).json(authError)
    }
    if (!user) {
      return res.status(401).json(info.message)
    }

    req.login(user, (loginError) => {
      if (loginError) {
        return next(loginError)
      }
      res.json({
        flag: true,
        message: '로그인 성공',
        user
      })
    })
  })(req, res, next )
})

router.get('/loginUser', (req, res) => {  
  res.json({
    flag: true,
    message: '유저정보 불러오기 성공',
    data: req.user
  })
})

router.post('/logout', (req, res, next) => {
  req.logout((logoutError) => {
    if (logoutError) {
      return next(logoutError)
    }
    res.redirect('/'); 
    res.json({
      flag: true,
      message: '로그아웃 되었습니다'
    })
  })
})

module.exports = router;
