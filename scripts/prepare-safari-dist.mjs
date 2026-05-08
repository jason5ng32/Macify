import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');
const manifestPath = resolve(dist, 'manifest.json');
const safariLocaleOverrides = {
  en: {
    ext_description:
      "Transform your new tab into macOS's gorgeous aerial screensaver videos.",
    video_apple_help_intro:
      "Some browsers may not trust Apple's sylvan.apple.com certificate, so direct video loading can fail. Two ways to make it work:",
    video_apple_help_option2_body_post:
      'in the target browser once. If you see a security warning, open the advanced option and proceed. The browser should remember your trust after that.',
    options_translation_description:
      'Translates English mottos into your display language when the browser provides an on-device Translator API. No new network requests beyond the one-time model download.',
    options_translation_status_no_api:
      "Your browser doesn't support the Translator API",
  },
  ja: {
    ext_description:
      '新しいタブをmacOSの美しいエアリアル・スクリーンセーバー動画に変えます。',
    video_apple_help_intro:
      '一部のブラウザでは Apple の sylvan.apple.com の証明書を信頼せず、動画の直接読み込みに失敗する可能性があります。2つの解決方法:',
    video_apple_help_option2_body_pre: '対象ブラウザで',
    video_apple_help_option2_body_post:
      'を一度開きます。セキュリティ警告が表示されたら、詳細オプションを開いて続行してください。ブラウザが信頼を記憶すれば、以降は直接接続が機能します。',
    options_translation_description:
      'ブラウザが on-device Translator API を提供している場合、英語の格言を表示言語に翻訳します。初回のモデルダウンロード以外、新たなネットワークリクエストはありません。',
    options_translation_status_no_api:
      'お使いのブラウザは Translator API 未対応です',
  },
  zh_CN: {
    ext_description: '将新标签页变成 macOS 的华丽航拍屏保视频。',
    video_apple_help_intro:
      '部分浏览器不一定信任苹果 sylvan.apple.com 的证书，直连视频可能失败。两种解决方案：',
    video_apple_help_option2_body_pre: '在目标浏览器里打开',
    video_apple_help_option2_body_post:
      '一次。如果出现安全警告，打开高级选项并继续访问。浏览器通常会记住你的信任，之后直连就没问题了。',
    options_translation_description:
      '当浏览器提供 on-device Translator API 时，把英文格言翻译成你设置的显示语言。除首次模型下载外，无任何新的网络请求。',
    options_translation_status_no_api: '你的浏览器不支持 Translator API',
  },
  zh_TW: {
    ext_description: '將新分頁變成 macOS 的華麗空拍螢幕保護影片。',
    video_apple_help_intro:
      '部分瀏覽器不一定信任蘋果 sylvan.apple.com 的憑證,直連影片可能失敗。兩種解決方案:',
    video_apple_help_option2_body_pre: '在目標瀏覽器裡開啟',
    video_apple_help_option2_body_post:
      '一次。如果出現安全性警告,請開啟進階選項並繼續前往。瀏覽器通常會記住你的信任,之後直連就沒問題了。',
    options_translation_description:
      '當瀏覽器提供 on-device Translator API 時,把英文格言翻譯成你設定的顯示語言。除首次模型下載外，無任何新的網路請求。',
    options_translation_status_no_api: '你的瀏覽器不支援 Translator API',
  },
};

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

// The background script only opens the options page on install/update.
// Removing it avoids Safari service-worker module compatibility warnings.
delete manifest.background;

if (Array.isArray(manifest.permissions)) {
  manifest.permissions = manifest.permissions.filter(
    (p) => !['topSites', 'favicon', 'idle'].includes(p),
  );
  if (manifest.permissions.length === 0) {
    delete manifest.permissions;
  }
}

await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

for (const [locale, overrides] of Object.entries(safariLocaleOverrides)) {
  const messagesPath = resolve(dist, '_locales', locale, 'messages.json');
  const messages = JSON.parse(await readFile(messagesPath, 'utf8'));
  for (const [key, message] of Object.entries(overrides)) {
    if (messages[key]) {
      messages[key].message = message;
    }
  }
  await writeFile(messagesPath, JSON.stringify(messages, null, 2) + '\n');
}

console.log('Prepared Safari-compatible dist assets');
