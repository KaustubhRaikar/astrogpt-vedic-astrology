"""
NLLB-200 translation layer — same engine used across your other bots
(ScriptureGPT, LawGPT, etc). Kept as a thin wrapper so the model can be swapped
or moved behind a hosted inference endpoint without touching callers.
"""
from functools import lru_cache

# FLORES-200 language codes NLLB-200 expects, keyed by simple app-facing codes.
# Extend this map as you add supported languages in the RN app's language picker.
LANG_CODE_MAP = {
    "en": "eng_Latn",
    "hi": "hin_Deva",
    "ta": "tam_Taml",
    "te": "tel_Telu",
    "bn": "ben_Beng",
    "mr": "mar_Deva",
    "gu": "guj_Gujr",
    "kn": "kan_Knda",
    "ml": "mal_Mlym",
    "pa": "pan_Guru",
    "ur": "urd_Arab",
}


@lru_cache(maxsize=1)
def _load_model():
    """Lazy-loaded so importing this module doesn't pull in torch/transformers
    until translation is actually needed (keeps chart/report-only requests fast)."""
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    model_name = "facebook/nllb-200-distilled-600M"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
    return tokenizer, model


def translate_text(text: str, target_lang: str, source_lang: str = "en") -> str:
    if target_lang not in LANG_CODE_MAP:
        raise ValueError(f"Unsupported target language: {target_lang}")

    tokenizer, model = _load_model()
    tokenizer.src_lang = LANG_CODE_MAP[source_lang]
    inputs = tokenizer(text, return_tensors="pt")

    target_code = LANG_CODE_MAP[target_lang]
    forced_bos_token_id = tokenizer.convert_tokens_to_ids(target_code)

    generated = model.generate(**inputs, forced_bos_token_id=forced_bos_token_id, max_new_tokens=512)
    return tokenizer.batch_decode(generated, skip_special_tokens=True)[0]
