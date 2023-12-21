const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')

const { client } = require('../database/index')
const db = client.db('lastTeamProject')

module.exports = () => {
  passport.use(new LocalStrategy({
    usernameField: 'userId',
    passwordField: 'passwd',
    passReqToCallback: false
  },
    async (userId, passwd, done) => { 
      try {
        // 기존 회원
        const exitUser = await db.collection('userInfo').findOne({ userId })
        // 신규 가입
        if (!exitUser) {
          return done(null, false, { message: '가입되지 않은 회원입니다.'})
        }

        // 비밀번호
        const result = await bcrypt.compare(passwd, exitUser.passwd)
        // 비밀번호가 틀리면
        if (!result) {
          return done(null, false, { message: '비밀번호가 일치하지 않습니다'})
        }

        // 모두 일치
        return done(null, exitUser)
      } catch (err) {
        console.error(err);
        done(err)
      }
    }
  ))
}