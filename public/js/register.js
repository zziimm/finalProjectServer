// 회원 가입 시
document.querySelector('#register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const userId = e.target.userId.value;
  const passwd = e.target.passwd.value;
  const email = e.target.email.value;
  const dog = e.target.dog.value;
  const dogSpecies = e.target.dogSpecies.value;
  const dogAge = e.target.dogAge.value;
  const dogName = e.target.dogName.value;
  // if (!userId) {
  //   return alert('아이디를 입력하세요');
  // }
  // if (!passwd) {
  //   return alert('비밀번호를 입력하세요');
  // }
  try {
    const result = await axios.post('/user/register', { userId, passwd, email, dog, dogSpecies, dogAge, dogName });

    if (!result.data.flag) {
      return alert(result.data.message);
    }
    location.href = '/';
  } catch (err) {
    console.error(err);
  }
  e.target.userId.value = '';
  e.target.passwd.value = '';
});