const express = require('express')
const passport = require('passport')
const bcrypt = require('bcrypt')
const { client } = require('../database/index');
const db = client.db('lastTeamProject');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');
const { ObjectId } = require('mongodb');


/**
 * @swagger
 * tags:
 *  name: user
 *  description: 로그인 및 회원가입
 */


// 회원가입
// ejs 추후 삭제
router.get('/register', async (req, res) => {
  // res.render('register');
  try {
    const signUserInfoGet = await db.collection('userInfo').findOne({})
    res.json({
      flag: true,
      message: '회원 정보 받음',
      data: signUserInfoGet
    })
  } catch (error) {
    console.error(error);
  }

});

// 프로필
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET
  },
  region: 'ap-northeast-2'
});

const upload = multer({
  storage: multerS3({
    s3,
    bucket: 'profileltp', // 만든 버킷 이름
    key(req, file, cb) { // 원본 파일명을 쓰고 싶으면 file 안에 들어있음
      cb(null, `original/${Date.now()}_${file.originalname}`); // 업로드 시 파일명
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 } // 파일 사이즈(바이트 단위): 5MB로 제한(그 이상 업로드 시 400번대 에러 발생)
});




/**
 * @swagger
 * tags:
 *   name: 사용자
 *   description: 사용자 관련 작업
 */

/**
 * @swagger
 * /user/register:
 *   post:
 *     summary: 사용자 회원가입
 *     description: 사용자 정보를 받아 회원가입을 처리합니다.
 *     tags: [사용자]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: 사용자 ID
 *               passwd:
 *                 type: string
 *                 description: 사용자 비밀번호
 *               email:
 *                 type: string
 *                 description: 사용자 이메일
 *               dog:
 *                 type: string
 *                 description: 사용자의 반려견 정보
 *               dogSpecies:
 *                 type: string
 *                 description: 반려견의 종류
 *               dogAge:
 *                 type: number
 *                 description: 반려견의 나이
 *               dogName:
 *                 type: string
 *                 description: 반려견의 이름
 *     responses:
 *       200:
 *         description: 회원가입 성공
 *       400:
 *         description: 잘못된 요청 또는 입력
 *       500:
 *         description: 서버 오류
 */


router.post('/register', async (req, res) => {
  console.log(req.body);
  const { userId, passwd, signEmail, signUserNicname, signDogType, signDogAge, signDogWeight, signDogName } = req.body

  // 정규표현식
  const userIdRegex = /^[a-zA-Z0-9]{4,10}$/;

  try {
    if (userId === '') {
      throw new Error('ID를 입력해주세요!');
    }

    if (signEmail === '') {
      throw new Error('이메일을 입력해주세요!')
    }

    if (passwd === '') {
      throw new Error('비밀번호를 입력해주세요!')

    }

    if (!userIdRegex.test(userId)) {
      throw new Error('ID는 4자 이상 10자 이하 알파벳 대소문자, 숫자로만 구성되어야 합니다.');
    }

    const existUser = await db.collection('userInfo').findOne({ userId })
    if (existUser) {
      throw new Error('존재하는 ID 입니다')
    }

    const existEmail = await db.collection('userInfo').findOne({ signEmail })
    if (existEmail) {
      throw new Error('존재하는 이메일 입니다')
    }

    const hash = await bcrypt.hash(passwd, 12)

    await db.collection('userInfo').insertOne({
      userId,
      passwd: hash,
      signEmail,
      signUserNicname,
      signDogType,
      signDogAge,
      signDogWeight,
      signDogName,


      // userId,
      // passwd: hash,
      // email,
      // dog,
      // dogSpecies,
      // dogAge,
      // dogName,
      imgUrl: req.file?.location || '',

    })

    res.json({
      flag: true,
      message: '회원 가입 성공',

    })

  } catch (error) {
    console.error(error);
    res.json({
      flag: false,
      message: error.message,
    })
  }
})



// 로그인 불러오기
router.get('/login', async (req, res) => {
  try {
    if (req.user) {
      const userId = req.user._id;
      const result = await db.collection('userInfo').findOne({ _id: new ObjectId(userId) });
      res.json({
        flag: true,
        message: '불러오기 성공',
        data: result
      })
    }
    else {
      res.json({
        flag: false,
        message: '비로그인 상태',
      })
    }
  } catch (error) {
    console.error(error);
    res.json({
      flag: false,
      message: '로그인 상태가 아님'
    })
  }
})


// 로그인
router.post('/login', (req, res, next) => {

  passport.authenticate('local', (authError, user, info) => {
    if (authError) {
      return res.json(authError)
    }
    if (!user) {
      return res.json(info.message)
    }

    req.login(user, (loginError) => {
      if (loginError) return next(loginError);
      // res.redirect('/')

      res.json({
        flag: true,
        message: '로그인 성공',
        user
      })
    })
  })(req, res, next);
});


// router.get('/loginUser', (req, res) => {
//   res.json({
//     flag: true,
//     message: '유저정보 불러오기 성공',
//     data: req.user
//   })
// })


// 로그아웃
router.get('/logout', (req, res, next) => {
  req.logout((logoutError) => {
    if (logoutError) return next(logoutError)
    // res.redirect('/');
    res.json({
      flag: true,
      message: '로그아웃 되었습니다'
    })
  })
})

// 유저 정보 주기(마이페이지)
router.get('/getUserInfo', async (req, res) => {
  try {
    const user = req.user._id;
    const result = await db.collection('userInfo').findOne( {_id: user });
    console.log(result);
    res.json({
      flag: true,
      result,
    })
  } catch (error) {
    console.error(error);
  }
});

// 유저 정보 변경
router.post('/editPersonalInfo', async (req, res) => {
  try {
    const { nick, dogType, dogName, dogAge } = req.body;
    const user = req.user._id;
    if (nick === '') {
      throw new Error('닉네임을 입력해주세요!');
    }
    if (dogName === '') {
      throw new Error('강아지 이름을 입력해주세요!');
    }
    if (dogAge === '') {
      throw new Error('강아지 나이를 입력해주세요!');
    }

    await db.collection('userInfo').updateOne({ _id: user },{ $set: {
      signUserNicname: nick,
      signDogType: dogType,
      signDogAge: dogAge,
      signDogName: dogName,
    }
    });
    const result = await db.collection('userInfo').findOne({ _id: user });
    res.json({
      flag: true,
      message: '회원 정보 수정 성공',
      result
    })
  } catch (error) {
    console.error(error);
    res.json({
      flag: false,
      message: error.message
    })
  }
});

// 회원 탈퇴
router.get('/accoutQuit', async (req, res) => {
  try {
    await db.collection('userInfo').deleteOne({
      _id: req.user._id
    });
    res.json({
      flag: true,
      message: '회원 탈퇴 성공'
    })
  } catch (err) {
    res.json({
      flag: false,
      message: '회원 탈퇴 실패'
    })
  }
});


module.exports = router;
