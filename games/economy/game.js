const catalog = [
  { name: '사과', emoji: '🍎', cost: 500, price: 900, demand: 13 },
  { name: '빵', emoji: '🥐', cost: 900, price: 1500, demand: 10 },
  { name: '우유', emoji: '🥛', cost: 1200, price: 2000, demand: 8 },
  { name: '커피', emoji: '☕', cost: 1800, price: 3000, demand: 7 },
];
const key = 'neighborhood-tycoon-v1';
const fresh = () => ({ day: 1, cash: 30000, reputation: 50, level: 1, products: catalog.map(p => ({ stock: 0, price: p.price })), news: ['가게를 열었습니다! 상품을 매입해 첫 영업을 시작하세요.'] });
let state;
try {
  const saved = JSON.parse(localStorage.getItem(key));
  state = saved && Array.isArray(saved.products) && saved.products.length === catalog.length ? saved : fresh();
} catch { state = fresh(); }
const won = n => `${Math.round(n).toLocaleString('ko-KR')}원`;
const $ = id => document.getElementById(id);
function save() { localStorage.setItem(key, JSON.stringify(state)); }
function render() {
  $('day').textContent = `${state.day}일차`;
  $('cash').textContent = won(state.cash);
  $('reputation').textContent = `${state.reputation} / 100`;
  $('level').textContent = `Lv. ${state.level}`;
  $('products').innerHTML = catalog.map((p, i) => {
    const item = state.products[i];
    return `<article class="product"><div class="emoji">${p.emoji}</div><div><h3>${p.name}</h3><div class="meta">재고 ${item.stock}개 · 매입가 ${won(p.cost)}</div></div><div class="controls"><label>판매 가격</label><div class="price-row"><button data-price="${i}" data-delta="-100" aria-label="${p.name} 가격 내리기">−</button><strong>${won(item.price)}</strong><button data-price="${i}" data-delta="100" aria-label="${p.name} 가격 올리기">+</button></div></div><button class="buy" data-buy="${i}" ${state.cash < p.cost * 10 ? 'disabled' : ''}>10개 매입<br>${won(p.cost * 10)}</button></article>`;
  }).join('');
  const upgradeCost = state.level * 25000;
  $('upgrade').textContent = `가게 확장 · ${won(upgradeCost)}`;
  $('upgrade').disabled = state.cash < upgradeCost;
  $('news').innerHTML = state.news.slice(0, 6).map((n, i) => `<div class="news-item"><small>${Math.max(1, state.day - i)}일차</small>${n}</div>`).join('');
  save();
}
$('products').addEventListener('click', event => {
  const buy = event.target.closest('[data-buy]');
  const price = event.target.closest('[data-price]');
  if (buy) {
    const i = Number(buy.dataset.buy), cost = catalog[i].cost * 10;
    if (state.cash >= cost) { state.cash -= cost; state.products[i].stock += 10; render(); }
  }
  if (price) {
    const i = Number(price.dataset.price);
    state.products[i].price = Math.max(100, state.products[i].price + Number(price.dataset.delta));
    render();
  }
});
$('upgrade').addEventListener('click', () => {
  const cost = state.level * 25000;
  if (state.cash < cost) return;
  state.cash -= cost; state.level++;
  state.news.unshift(`가게를 Lv. ${state.level}로 확장했습니다! 손님이 더 많이 찾아옵니다.`);
  render();
});
$('next-day').addEventListener('click', () => {
  const events = [
    { text: '맑은 날씨로 손님이 늘었습니다.', factor: 1.25 },
    { text: '평범한 하루였습니다.', factor: 1 },
    { text: '비가 와서 손님이 조금 줄었습니다.', factor: .8 },
    { text: '동네 축제로 손님이 몰렸습니다!', factor: 1.5 },
  ];
  const event = events[Math.floor(Math.random() * events.length)];
  let revenue = 0, sold = 0, missed = 0;
  catalog.forEach((p, i) => {
    const item = state.products[i];
    const priceEffect = Math.max(.15, 1.6 - item.price / p.price * .6);
    const visitors = Math.max(0, Math.round(p.demand * priceEffect * event.factor * (1 + (state.level - 1) * .25) * (state.reputation / 50) * (.75 + Math.random() * .5)));
    const count = Math.min(item.stock, visitors);
    item.stock -= count; sold += count; missed += visitors - count; revenue += count * item.price;
  });
  state.cash += revenue;
  state.reputation = Math.max(10, Math.min(100, state.reputation + (sold ? 2 : -2) - (missed > sold ? 3 : 0)));
  state.news.unshift(`${event.text} ${sold}개 판매 · 매출 ${won(revenue)}${missed ? ` · 재고 부족 ${missed}개` : ''}`);
  state.news = state.news.slice(0, 12);
  state.day++;
  render();
});
$('reset').addEventListener('click', () => {
  if (confirm('저장된 진행 상황을 지우고 새로 시작할까요?')) { state = fresh(); render(); }
});
render();
