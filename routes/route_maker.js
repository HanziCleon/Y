import { Router } from "express";
import axios from "axios";
import FormData from "form-data";
import * as cheerio from "cheerio";
import { validate, asyncHandler } from "../utils/validation.js";

const router = Router();

// Text to Image Generator
async function textToImage(prompt) {
  const res = await axios.post(
    "https://www.texttoimage.org/generate",
    new URLSearchParams({ prompt }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest"
      }
    }
  );
  
  if (!res.data.success) throw new Error("Failed to generate image");
  
  const pageUrl = `https://www.texttoimage.org/${res.data.url}`;
  const html = await axios.get(pageUrl);
  const $ = cheerio.load(html.data);
  const imageUrl = $('meta[property="og:image"]').attr("content") || $("img").first().attr("src");
  
  return { prompt, pageUrl, imageUrl };
}

router.get("/maker/text2img", asyncHandler(async (req, res) => {
  const { prompt } = req.query;
  
  if (!validate.notEmpty(prompt)) {
    return res.status(400).json({
      success: false,
      error: "Prompt is required"
    });
  }
  
  const result = await textToImage(prompt);
  res.json({ success: true, data: result });
}));

router.post("/maker/text2img", asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  
  if (!validate.notEmpty(prompt)) {
    return res.status(400).json({
      success: false,
      error: "Prompt is required"
    });
  }
  
  const result = await textToImage(prompt);
  res.json({ success: true, data: result });
}));

// Image Enhancer
async function enhanceImage(imageUrl) {
  // Download image first
  const imgResponse = await axios.get(imageUrl, {
    responseType: "arraybuffer",
    timeout: 30000
  });
  
  const buffer = Buffer.from(imgResponse.data);
  
  // Create form data
  const form = new FormData();
  form.append("file", buffer, {
    filename: "image.jpg",
    contentType: "image/jpeg"
  });
  
  const response = await axios.post("https://enhanceit.pro/proxy-1.php", form, {
    headers: form.getHeaders(),
    timeout: 60000
  });
  
  if (!response.data?.output_url) {
    throw new Error("Failed to enhance image");
  }
  
  return response.data.output_url;
}

router.get("/maker/enhance", asyncHandler(async (req, res) => {
  const { url } = req.query;
  
  if (!validate.url(url)) {
    return res.status(400).json({
      success: false,
      error: "Invalid image URL"
    });
  }
  
  const outputUrl = await enhanceImage(url);
  res.json({
    success: true,
    data: {
      original_url: url,
      enhanced_url: outputUrl
    }
  });
}));

router.post("/maker/enhance", asyncHandler(async (req, res) => {
  const { url } = req.body;
  
  if (!validate.url(url)) {
    return res.status(400).json({
      success: false,
      error: "Invalid image URL"
    });
  }
  
  const outputUrl = await enhanceImage(url);
  res.json({
    success: true,
    data: {
      original_url: url,
      enhanced_url: outputUrl
    }
  });
}));

export const metadata = [
  {
    name: "Text to Image",
    path: "/maker/text2img",
    method: "GET, POST",
    description: "Generate images from text prompts",
    params: [
      {
        name: "prompt",
        type: "text",
        required: true,
        placeholder: "cat yellow",
        description: "Image generation prompt"
      }
    ]
  },
  {
    name: "Remini",
    path: "/maker/remini",
    method: "GET, POST",
    description: "Enhance image quality using AI",
    params: [
      {
        name: "url",
        type: "text",
        required: true,
        placeholder: "https://example.com/image.jpg",
        description: "Image URL to enhance"
      }
    ]
  }
];

export default router;