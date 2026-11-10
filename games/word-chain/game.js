(() => {
  const form = document.querySelector('#word-form');
  const entry = document.querySelector('#word-entry');
  const language = document.querySelector('#word-language');
  const turn = document.querySelector('#word-turn');
  const message = document.querySelector('#word-message');
  const history = document.querySelector('#word-history');
  const used = new Set();
  const hardEndings = new Set('륨 늄 슘 튬 퓸 듐 윰 즙 녘 릎 릇 틱 닻 볏 덫 헿 픗 톳 켓 펙 렝 뵤 죵 쥬 쵸 큥 퓌 힉 뢰 롸 릐 뤠 롶 눞'.split(' '));
  let previous = '';

  function allowedStarts(last) {
    if (language.value === 'en') return [last];
    const offset = last.charCodeAt(0) - 0xac00;
    const initial = Math.floor(offset / 588);
    const vowel = Math.floor((offset % 588) / 28);
    const takesIeung = [2, 6, 7, 12, 17, 20].includes(vowel);
    if (initial === 5 || (initial === 2 && takesIeung)) {
      const replacement = takesIeung ? 11 : 2;
      return [last, String.fromCharCode(0xac00 + replacement * 588 + offset % 588)];
    }
    return [last];
  }

  function reset() {
    used.clear();
    previous = '';
    history.replaceChildren();
    form.reset();
    turn.textContent = '1번 플레이어 차례';
    message.textContent = '첫 단어를 입력하세요.';
  }

  document.querySelector('#word-reset').addEventListener('click', reset);
  language.addEventListener('change', reset);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const isKorean = language.value === 'ko';
    const word = entry.value.trim().normalize('NFC').toLowerCase();
    const alphabet = isKorean ? /^[가-힣]{2,}$/ : /^[a-z]{2,}$/;
    if (!alphabet.test(word)) {
      message.textContent = isKorean ? '한글 단어를 두 글자 이상 입력하세요.' : '영어 단어를 두 글자 이상 입력하세요.';
      return;
    }
    const starts = previous ? allowedStarts(previous.slice(-1)) : [];
    if (starts.length && !starts.includes(word[0])) {
      message.textContent = starts.join(' 또는 ') + '(으)로 시작하는 단어를 입력하세요.';
      return;
    }
    if (used.has(word)) {
      message.textContent = '이미 사용한 단어입니다.';
      return;
    }
    if (isKorean && used.size < 5 && hardEndings.has(word.slice(-1))) {
      message.textContent = '처음 다섯 차례에는 한방 단어로 끝낼 수 없습니다.';
      return;
    }

    used.add(word);
    previous = word;
    const item = document.createElement('li');
    item.textContent = word;
    history.prepend(item);
    turn.textContent = (used.size % 2 + 1) + '번 플레이어 차례';
    message.textContent = '다음 시작 글자 · ' + allowedStarts(word.slice(-1)).join(' 또는 ');
    entry.value = '';
    entry.focus();
  });
})();
