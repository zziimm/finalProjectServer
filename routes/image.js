const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');

const router = express.Router();


const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
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

router.post('/img', upload.single('img'), async (req, res, next) => {
  console.log(req.file); // 업로드 후 S3 객체 정보
  console.log(req.file?.location); // 이미지의 URL, img 태그 src 속성에 넣으면 동작

  console.log(req.body);
  // 클라이언트가 보낸 데이터 -> 요청 본문에 담김 -> body-parser가 분석해서 req.body에 객체로 저장

  // DB 예외 처리
  try {
    const title = req.body.title;
    const content = req.body.content;

    // 유효성 검사 추가하기
    // 제목이 비어있으면 저장 안함
    if (!title) {
      res.json({
        flag: false,
        message: '제목을 입력하세요'
      });
    } else {
      // Quiz: DB에 저장하기
      await db.collection('post').insertOne({
        title,
        content,
        // 이미지 URL을 글과 함께 DB에 저장
        // imgUrl: req.file ? req.file.location : '',
        imgUrl: req.file?.location || '',
        // 글 등록 시 작성자 정보 넣기
        user: req.user._id,
        username: req.user.username,
        // username(수정 가능한 정보라고 가
      })
            res.json({
        flag: true,
        message: '등록 성공'
      });
    }
  } catch (err) {
    // (참고) 예외처리는 정답이 없음, 회사/팀의 룰 또는 기획 의도에 따라 달라짐
    err.status = 500;
    next(err);
  }
});