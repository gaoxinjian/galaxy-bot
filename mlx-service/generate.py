# generate.py

from mlx_lm import generate, stream_generate
from mlx_lm.sample_utils import make_sampler
from fastapi.responses import StreamingResponse
import json

def build_sampler(req: ChatCompletionRequest):
    return make_sampler(
        temp=req.temperature,
        top_p=req.top_p,
        top_k=req.top_k,
    )

def run_inference(
    model,
    tokenizer,
    prompt: str,
    max_tokens: int = 512,
    temperature: float = 0.7,
):
    sampler = make_sampler(
        temp=temperature,
        top_p=0.9
    )
    return generate(
        model,
        tokenizer,
        prompt=prompt,
        max_tokens=max_tokens,
        sampler=sampler
    )

def stream_inference(
    model,
    tokenizer,
    prompt: str,
    max_tokens: int = 512,
    temperature: float = 0.7,
):
    sampler = make_sampler(
        temp=temperature,
        top_p=0.9
    )
    for response in stream_generate(
        model,
        tokenizer,
        prompt=prompt,
        max_tokens=max_tokens,
        sampler=sampler
    ):
        yield response.text


def normal_chat(model, tokenizer, prompt, req):
    sampler = build_sampler(req)

    output = generate(
        model,
        tokenizer,
        prompt=prompt,
        sampler=sampler,
        max_tokens=req.max_tokens,
    )

    return {
        "id": "chatcmpl-mlx",
        "object": "chat.completion",
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": output
                },
                "finish_reason": "stop",
                "index": 0
            }
        ]
    }


def stream_chat(model, tokenizer, prompt, req):
    sampler = make_sampler(temp=req.temperature)

    def generator():
        for response in stream_generate(
            model,
            tokenizer,
            prompt=prompt,
            sampler=sampler,
            max_tokens=req.max_tokens,
        ):
            chunk = {
                "id": "chatcmpl-mlx",
                "object": "chat.completion.chunk",
                "choices": [
                    {
                        "delta": {"content": response.text},
                        "index": 0,
                        "finish_reason": None,
                    }
                ],
            }
            yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"

        # 结束标记
        yield "data: [DONE]\n\n"

    return StreamingResponse(generator(), media_type="text/event-stream")
