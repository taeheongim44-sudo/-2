import { Client, GatewayIntentBits } from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
} from "@discordjs/voice";
import googleTTS from "google-tts-api";
import dotenv from "dotenv";

dotenv.config();

// 🔧 Discord 클라이언트 생성
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const connections = new Map(); // 서버별 연결 저장용 Map

// ✅ 봇 로그인
client.once("ready", () => {
  console.log(`✅ 로그인 성공: ${client.user.tag}`);
});

// ✅ 메시지 이벤트 처리
client.on("messageCreate", async (message) => {
  if (message.author.bot) return; // 봇 메시지 무시

  // ------------------------------
  // 🎯 기본 명령어들
  // ------------------------------
  if (message.content === "!뉴비가이드") {
    return message.reply("https://game.naver.com/lounge/Trickcal/board/detail/6709894");
  }

  if (message.content === "!음식") {
    return message.reply("https://docs.google.com/spreadsheets/d/1OF0Qh0SsgUacdMjDND6B3Cxm-oXiwwI83RlluGcj4DY/edit?gid=300313147#gid=300313147");
  }

  if (message.content === "!모험회") {
    return message.reply("https://gall.dcinside.com/mgallery/board/view?id=rollthechess&no=1855402");
  }

  if (message.content === "!사도") {
    return message.reply("https://gall.dcinside.com/mgallery/board/view?id=rollthechess&no=2353801");
  }

  if (message.content === "!순수") {
    return message.reply("https://www.youtube.com/watch?v=VWpottUm9fg&t=332s");
  }

  if (message.content === "!광기") {
    return message.reply("https://www.youtube.com/watch?v=V3thUf-3SeI");
  }

  if (message.content === "!냉정") {
    return message.reply("https://www.youtube.com/watch?v=iIiweU2j7lY&t=156s");
  }

  if (message.content === "!우울") {
    return message.reply("https://www.youtube.com/watch?v=Vs2V5T7TOHg");
  }

  if (message.content === "!활발") {
    return message.reply("https://www.youtube.com/watch?v=4vjEtSd4JUc");
  }

  if (message.content === "!프론티어") {
    return message.reply("https://www.youtube.com/watch?v=JUL8x1ztrD0");
  }

  if (message.content === "!도움말") {
    return message.reply(
      "안녕하세요 버터에요! `!`를 치시고 이용하시면 돼요. 뉴비가이드, 음식, 모험회, 사도, 각 성격별 사도추천(ex `!냉정`, `!활발`)이 준비되어있어요. 필요한 게 있으면 엘레나 님에게 말해주세요!"
    );
  }

  // ------------------------------
  // 🔊 TTS 기능 (tts 채널 전용)
  // ------------------------------
  if (message.channel.name !== "tts") return;

  // 🎧 봇 음성 채널 참가 명령
  if (message.content === "~참가") {
    const channel = message.member?.voice.channel;
    if (!channel) {
      return message.reply("먼저 음성 채널에 들어가 주세요! 🎧");
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    connections.set(message.guild.id, connection);
    return message.reply("음성 채널에 접속했어요! 이제 이 채널의 메시지를 읽어드릴게요 🔊");
  }

  // ❌ 봇 음성 채널 나가기 명령
  if (message.content === "~나가기") {
    const connection = connections.get(message.guild.id);
    if (connection) {
      connection.destroy();
      connections.delete(message.guild.id);
      return message.reply("음성 채널에서 나갔어요 👋");
    } else {
      return message.reply("이미 음성 채널에 없어요!");
    }
  }

  // 🎙️ 일반 메시지 읽기
  const connection = connections.get(message.guild.id);
  if (!connection || message.content.startsWith("~")) return;

  try {
    const text = `${message.member?.displayName || message.author.username}님이 말합니다. ${message.content}`;
    const url = googleTTS.getAudioUrl(text, {
      lang: "ko",
      slow: false, // 빠른 음성
      host: "https://translate.google.com",
    });

    const resource = createAudioResource(url);
    const player = createAudioPlayer();
    connection.subscribe(player);
    player.play(resource);
  } catch (err) {
    console.error("TTS 오류:", err);
  }
});

// 🔐 로그인 실행
client.login(process.env.TOKEN);