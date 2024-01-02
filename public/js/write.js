document.getElementById('write-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const title = document.getElementById('title').value;
  const content = document.getElementById('content').value;
  const price = document.getElementById('price').value;
  const category = document.getElementById('category').value;
  const date = document.getElementById('date').value;
  const imagesInput = document.getElementById('images');
  const images = imagesInput.files;

  try {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    formData.append('price', price);
    formData.append('category', category);
    formData.append('date', date);

    // 여러 이미지를 formData에 추가
    for (let i = 0; i < images.length; i++) {
      formData.append('images', images[i]);
    }

    const response = await axios.post('/vintage/insert', formData);
    console.log(response.data);

    if (!response.data.flag) {
      return alert(response.data.message);
    }

    // 등록이 성공했을 때의 처리 (예: 페이지 이동)
    location.href = '/vintage'; // 등록 후 이동할 페이지 경로

  } catch (error) {
    console.error('Error:', error);
    // 에러가 발생했을 때의 처리
    alert('등록 중 오류가 발생했습니다.');
  }
});
