---
layout: chronicle
title: 끝말잇기
description: 한 화면에서 즐기는 2인 끝말잇기.
---

<div class="game-intro">
  <a href="{{ '/games/' | relative_url }}">← 게임 목록</a>
  <p class="overline">WORD GAME · 2 PLAYERS</p>
  <h1>끝말잇기</h1>
  <p>한 화면에서 번갈아 단어를 입력하세요. 단어가 실제로 있는지는 두 사람이 함께 판단합니다.</p>
</div>

<div class="chapter word-chain">
  <label for="word-language">언어</label>
  <select id="word-language">
    <option value="ko">한국어</option>
    <option value="en">영어</option>
  </select>
  <button class="game-reset" id="word-reset" type="button">새 게임</button>
  <h2 id="word-turn">1번 플레이어 차례</h2>
  <form id="word-form">
    <label for="word-entry">단어</label>
    <input id="word-entry" required autocomplete="off" autocapitalize="none" spellcheck="false">
    <button class="hero-link" type="submit">잇기</button>
  </form>
  <p id="word-message" role="status">첫 단어를 입력하세요.</p>
  <ol class="entries" id="word-history" aria-label="입력한 단어"></ol>
  <noscript>게임을 하려면 브라우저에서 자바스크립트를 켜 주세요.</noscript>
</div>
<script src="{{ '/games/word-chain/game.js' | relative_url }}" defer></script>
