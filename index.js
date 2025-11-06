import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import "dotenv/config";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import googleTTS from "google-tts-api";
import fetch from "node-fetch";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from "@discordjs/voice";
import { Readable } from "stream";

const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.error("ERROR: .env에 TOKEN 변수가 없습니다.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers, // 👈 새 유저 인사 기능용
  ],
});

const PREFIX = "!";
const NOTICE_CHANNEL_NAME = "트릭컬공지";
const UPDATE_URL = "https://m.cafe.naver.com/ca-fe/web/cafes/30131231/menus/67";
const COUPON_URL = "https://m.cafe.naver.com/ca-fe/web/cafes/30131231/menus/85";

// --------------------- TTS ---------------------
async function streamFromUrl(url) {
  const res = await fetch(url, { headers: { Referer: "https://translate.google.com" } });
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return Readable.from(buffer);
}

async function playTTSInConnection(voiceChannel, text) {
  try {
    const ttsUrl = googleTTS.getAudioUrl(text, { lang: "ko", slow: false });
    const stream = await streamFromUrl(ttsUrl);
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });
    const player = createAudioPlayer();
    const resource = createAudioResource(stream);
    player.play(resource);
    connection.subscribe(player);
    player.on(AudioPlayerStatus.Idle, () => connection.destroy());
  } catch (err) {
    console.error("TTS 오류:", err);
  }
}

// --------------------- Puppeteer ---------------------
async function openBrowser() {
  return puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });
}

async function fetchPostsFromMenu(menuUrl) {
  const browser = await openBrowser();
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)");
  await page.goto(menuUrl, { waitUntil: "networkidle2" });

  const posts = await page.$$eval("a", (anchors) => {
    const results = [];
    for (const a of anchors) {
      const href = a.getAttribute("href") || "";
      const text = (a.innerText || "").trim();
      if (!text) continue;
      if (href.includes("ArticleRead") || href.includes("article")) {
        results.push({ title: text, href });
      }
    }
    return results;
  });

  await browser.close();
  return posts;
}

async function fetchPostPreview(href) {
  const browser = await openBrowser();
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)");
  const url = href.startsWith("http") ? href : `https://m.cafe.naver.com${href}`;
  await page.goto(url, { waitUntil: "networkidle2" });

  const preview = await page.evaluate(() => {
    const el =
      document.querySelector(".se-main-container") ||
      document.querySelector(".article_text") ||
      document.querySelector(".board_main") ||
      document.querySelector(".content");
    if (el) {
      const text = el.innerText.trim().replace(/\s+/g, " ");
      return text.length > 200 ? text.slice(0, 200) + "..." : text;
    }
    return "내용 미리보기를 불러올 수 없습니다.";
  });

  await browser.close();
  return preview;
}

async function getLatestPost(type) {
  const menuUrl = type === "update" ? UPDATE_URL : COUPON_URL;
  const posts = await fetchPostsFromMenu(menuUrl);
  if (!posts || posts.length === 0) return null;
  const filtered = posts.filter(
    (p) => !p.title.includes("공지") && !p.title.includes("안내")
  );
  const target = filtered.length > 0 ? filtered[0] : posts[0];
  const preview = await fetchPostPreview(target.href);
  const link = target.href.startsWith("http")
    ? target.href
    : `https://m.cafe.naver.com${target.href}`;
  return { title: target.title, link, preview };
}

async function getCouponList() {
  const posts = await fetchPostsFromMenu(COUPON_URL);
  if (!posts || posts.length === 0) return [];
  const coupons = [];
  const limit = Math.min(posts.length, 10);
  for (let i = 0; i < limit; i++) {
    const p = posts[i];
    const preview = await fetchPostPreview(p.href);
    const combined = `${p.title}\n${preview}`;
    const codeMatches = combined.match(/\b[A-Za-z0-9]{5,20}\b/g) || [];
    const dateMatches = combined.match(/\b\d{1,4}[./]\d{1,2}[./]?\d{0,4}\b/g) || [];
    const codesFiltered = codeMatches.filter(
      (c) => /[A-Za-z]/.test(c) || c.length >= 6
    );
    if (codesFiltered.length > 0) {
      coupons.push({
        code: codesFiltered[0],
        expires: dateMatches[0] || "유효기간 없음",
        title: p.title,
        link: p.href.startsWith("http")
          ? p.href
          : `https://m.cafe.naver.com${p.href}`,
      });
    }
  }
  return coupons;
}

// --------------------- 명령어 ---------------------
client.on("messageCreate", async (m) => {
  if (m.author.bot) return;
  const content = m.content.trim();

  // 🎙️ TTS
  if (m.channel.name === "tts" && !content.startsWith("~")) {
    const vc = m.member?.voice?.channel;
    if (vc) playTTSInConnection(vc, content);
  }

  if (!content.startsWith(PREFIX)) return;
  const [cmd] = content.slice(1).split(" ");

  switch (cmd) {
    case "도움말":
      return m.reply(
        "**사용 가능한 명령어 목록**\n" +
          "📢 `!공지` – 최신 공지 불러오기\n" +
          "🎁 `!쿠폰` – 최신 쿠폰 공지 보기\n" +
          "🎫 `!쿠폰목록` – 사용 가능한 쿠폰 목록\n" +
          "🧭 `!뉴비가이드` – 트릭컬 초보자 가이드\n" +
          "💡 `!사도`, `!광기`, `!냉정` – 성격별 링크 보기"
      );

    case "뉴비가이드":
      return m.reply(
        "🧭 **트릭컬 리바이브 뉴비 가이드**\n" +
          "https://game.naver.com/lounge/Trickcal/board/detail/6709894\n" +
          "사도 음식호감도표 🍽️\n" +
          "https://docs.google.com/spreadsheets/d/1OF0Qh0SsgUacdMjDND6B3Cxm-oXiwwI83RlluGcj4DY/edit?gid=300313147#gid=300313147"
      );

    case "사도":
      return m.reply(
        "📘 **사도별 정보 링크**\n" +
          "사도별 모험회: https://docs.google.com/spreadsheets/d/1OF0Qh0SsgUacdMjDND6B3Cxm-oXiwwI83RlluGcj4DY/edit?gid=300313147#gid=300313147\n" +
          "성격별 사도 추천: https://gall.dcinside.com/mgallery/board/view?id=rollthechess&no=2353801"
      );

    case "광기":
      return m.reply("😈 광기 성격 사도 추천 영상\nhttps://www.youtube.com/watch?v=V3thUf-3SeI");

    case "냉정":
      return m.reply("🧊 냉정 성격 사도 추천 영상\nhttps://www.youtube.com/watch?v=iIiweU2j7lY&t=156s");

    case "쿠폰":
    case "업데이트": {
      const type = cmd === "쿠폰" ? "coupon" : "update";
      const post = await getLatestPost(type);
      if (!post) return m.reply("불러올 수 없습니다.");
      const embed = new EmbedBuilder()
        .setColor(type === "update" ? 0x00bfff : 0x00ff99)
        .setTitle(type === "update" ? "📢 최신 업데이트" : "🎁 최신 쿠폰")
        .setDescription(`**${post.title}**\n\n${post.preview}`)
        .setURL(post.link);
      return m.reply({ embeds: [embed] });
    }

    case "쿠폰목록": {
      const coupons = await getCouponList();
      if (coupons.length === 0) return m.reply("쿠폰을 불러올 수 없습니다.");
      const embed = new EmbedBuilder()
        .setTitle("🎫 사용 가능한 쿠폰 목록")
        .setDescription(
          coupons.map((c) => `**${c.code}** — ${c.expires}\n${c.title}`).join("\n\n")
        )
        .setColor(0xffcc00);
      return m.reply({ embeds: [embed] });
    }
  }
});

// --------------------- 새 유저 인사 ---------------------
client.on("guildMemberAdd", async (member) => {
  const channel = member.guild.systemChannel;
  if (!channel) return;
  channel.send(
    `👋 어서오세요, **${member.user.username}**님!\n트릭컬 리바이브 커뮤니티에 오신 걸 환영합니다! 🌟`
  );
});

// --------------------- Ready ---------------------
client.once("ready", () => {
  console.log(`✅ ${client.user.tag} 실행됨`);
  setInterval(() => console.log("⏱️ 스케줄 체크 중..."), 1000 * 60 * 60);
});


client.login(TOKEN);
