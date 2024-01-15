document.getElementById('like').addEventListener('click', async (e) => {
  const resulte = await axios.post('/community/test/like', {});
  alert(resulte.data.message)
});