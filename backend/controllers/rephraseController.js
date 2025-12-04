// backend/src/routes/rephrase.js
import express from 'express';
import fetch from 'node-fetch'; // or use global fetch in Node 18+
import { GoogleGenerativeAI } from "@google/generative-ai";
export async function rephrase(req, res) {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text_required' });
  if (!process.env.GEMINI_API_KEY) {
    return res.status(400).json({ error: 'GEMINI_API_KEY_missing' });
  }

  // pick the model you have access to
  const MODEL = 'gemini-2.5-flash'; // or gemini-2.5-flash-lite, gemini-pro, etc.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  // Build payload following Gemini docs: contents -> parts -> text
  const payload = {
    // contents is an array — each item may represent a turn or multimodal input
    contents: [
      {
        parts: [
          {
            // the actual prompt text
            text: `Rephrase the following text in a friendly, professional tone:\n\n${text}`
          }
        ]
      }
    ],
    // generation tuning (optional)
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 150
    }
  };

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const json = await resp.json();

    if (!resp.ok) {
      console.error('Gemini REST error:', resp.status, json);
      return res.status(500).json({ error: 'llm_error', message: json?.error || JSON.stringify(json).slice(0, 400) });
    }

    // ---- Robust extraction of text from common Gemini JSON shapes ----
    let output = null;

    // common: json.safetyAttributes / json.candidates / json.output ... so we check several places

    // 1) some examples have json?.candidates[0]?.output or .content/text
    try {
      if (Array.isArray(json?.candidates) && json.candidates.length) {
        // candidate may have content array or text
        const c0 = json.candidates[0];
        if (typeof c0?.content === 'string') output = c0.content;
        // sometimes it's structured:
        if (!output && Array.isArray(c0?.content)) {
          const block = c0.content.find(p => p && typeof p.text === 'string');
          if (block) output = block.text;
        }
        if (!output && typeof c0?.text === 'string') output = c0.text;
      }
    } catch (e) { /* ignore */ }

    // 2) json?.output?.[0]?.content -> array of blocks with .text
    try {
      if (!output && Array.isArray(json?.output) && json.output.length) {
        const first = json.output[0];
        if (Array.isArray(first?.content)) {
          const block = first.content.find(c => typeof c.text === 'string');
          if (block) output = block.text;
        }
        if (!output && typeof first?.text === 'string') output = first.text;
      }
    } catch (e) {}

    // 3) some docs show json?.text or json?.response?.text
    if (!output) {
      if (typeof json?.text === 'string') output = json.text;
      else if (typeof json?.response?.text === 'function') {
        try { output = json.response.text(); } catch (e) {}
      } else if (typeof json?.response?.text === 'string') output = json.response.text;
    }

    // 4) Some servers return contents->[0]->text or contents->[0]->parts->[0]->text (echo)
    if (!output) {
      try {
        if (Array.isArray(json?.contents) && json.contents.length) {
          const c = json.contents[0];
          if (Array.isArray(c?.parts) && c.parts.length && typeof c.parts[0].text === 'string') {
            output = c.parts[0].text;
          } else if (typeof c?.text === 'string') output = c.text;
        }
      } catch (e) {}
    }

    // 5) fallback: stringify some response (short)
    if (!output) {
      console.log('RAW_GEMINI_RESPONSE (truncated):', (() => {
        try { return JSON.stringify(json, null, 2).slice(0, 2000); } catch (e) { return String(json).slice(0, 2000); }
      })());
      return res.status(500).json({
        error: 'no_output_extracted',
        message: 'Could not find textual output in Gemini response. Server logged RAW_GEMINI_RESPONSE.'
      });
    }

    return res.json({ text: output, raw: json });
  } catch (err) {
    console.error('Gemini REST fetch error:', err);
    return res.status(500).json({ error: 'llm_error', message: String(err) });
  }
}
