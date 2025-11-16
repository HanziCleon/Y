import FormData from 'form-data';
import axios from 'axios';

let handler = async (m, { conn, reply, quoted }) => {
  try {
    const quotedMessage = m.quoted ? m.quoted : m;
    const mime = (quotedMessage.msg || quotedMessage).mimetype || "";

    if (!/image/.test(mime)) {
      return reply(`❌ Reply sebuah gambar dengan caption .enhance\n\nContoh:\n> Reply gambar lalu ketik .enhance`);
    }

    await reply('⏳ Sedang memproses gambar...\nMohon tunggu sebentar.');

    // Download image dari WhatsApp
    const media = await quotedMessage.download();
    
    // Upload ke Catbox
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', media, {
      filename: 'image.jpg',
      contentType: mime
    });

    const uploadResponse = await axios.post('https://catbox.moe/user/api.php', form, {
      headers: form.getHeaders()
    });

    const imageUrl = uploadResponse.data.trim();
    
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return reply('❌ Gagal upload gambar ke Catbox.');
    }

    await reply(`📤 Upload berhasil!\n🔗 ${imageUrl}\n\n⚙️ Sedang enhance gambar...`);

    // Enhance image menggunakan API
    const enhanceUrl = `https://www.dongtube.my.id/api/enhance/image?url=${encodeURIComponent(imageUrl)}`;
    
    const enhanceResponse = await axios.get(enhanceUrl, {
      responseType: 'arraybuffer',
      timeout: 60000, // 60 detik timeout
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    const enhancedImage = Buffer.from(enhanceResponse.data);

    // Kirim hasil enhanced image
    await conn.sendMessage(m.chat, {
      image: enhancedImage,
      caption: `✅ *Image Enhanced Successfully!*\n\n📸 Original: ${imageUrl}\n🎨 Processed by: Dongtube API\n⚡ Bot: ${global.namebotz || 'Alifatah wabot'}`,
      contextInfo: {
        externalAdReply: {
          title: '✨ Image Enhancer',
          body: 'Powered by Dongtube API',
          thumbnailUrl: imageUrl,
          sourceUrl: global.YouTube || '',
          mediaType: 1,
          renderLargerThumbnail: false
        }
      }
    }, { quoted: m });

  } catch (error) {
    console.error('Error enhance image:', error);
    
    let errorMsg = '❌ Gagal memproses gambar.\n\n';
    
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      errorMsg += '⏱️ Timeout: Proses terlalu lama, coba gambar yang lebih kecil.';
    } else if (error.response) {
      errorMsg += `📡 API Error: ${error.response.status}\n${error.response.statusText}`;
    } else if (error.request) {
      errorMsg += '📡 Tidak dapat terhubung ke API.';
    } else {
      errorMsg += `⚠️ ${error.message}`;
    }
    
    reply(errorMsg);
  }
};

handler.help = ['enhance', 'hd', 'remini'];
handler.tags = ['tools'];
handler.command = ['enhance', 'hd', 'remini', 'enhancer'];
handler.limit = 3;

export default handler;