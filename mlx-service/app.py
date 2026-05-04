# app.py

from fastapi import FastAPI
from pydantic import BaseModel
from models import get_model, scan_models, model_manager
from fastapi.responses import StreamingResponse
from mlx_lm.sample_utils import make_sampler
from mlx_lm import generate, stream_generate
import json, time, uuid
from fastapi import HTTPException

DEFAULT_SYSTEM_PROMPT = "你是一个专业、简洁的AI助手，请直接给出答案，不要输出思考过程。"

app = FastAPI()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    conversation_id: str | None = None

    model: str
    messages: list[ChatMessage]

    temperature: float = 0.7
    top_p: float = 0.9
    top_k: int = 40
    max_tokens: int = 512

    stream: bool = False
    stop: list[str] | None = None

    system_prompt: str | None = None   # 👈 新增

def build_prompt(tokenizer, messages, system_prompt=None):
    msgs = inject_system_prompt(messages, system_prompt)

    return tokenizer.apply_chat_template(
        msgs,
        tokenize=False,
        add_generation_prompt=True
    )

def build_sampler(req: ChatCompletionRequest):
    return make_sampler(
        temp=req.temperature,
        top_p=req.top_p,
        top_k=req.top_k,
    )

def inject_system_prompt(messages, system_prompt=None):
    msgs = [m.dict() for m in messages]

    has_system = any(m["role"] == "system" for m in msgs)

    if system_prompt:
        # 强制覆盖模式（高级用法）
        msgs = [m for m in msgs if m["role"] != "system"]
        msgs.insert(0, {"role": "system", "content": system_prompt})
    elif not has_system:
        # 默认补 system
        msgs.insert(0, {
            "role": "system",
            "content": DEFAULT_SYSTEM_PROMPT
        })

    return msgs

def normal_chat(model, tokenizer, prompt, req, request_id):
    sampler = build_sampler(req)

    result = generate(
        model,
        tokenizer,
        prompt=prompt,
        sampler=sampler,
        max_tokens=req.max_tokens,
        return_dict=True
    )

    output = result["text"]

    # stop 截断
    if req.stop:
        for stop_word in req.stop:
            if stop_word in output:
                output = output.split(stop_word)[0]

    prompt_tokens = result["prompt_tokens"]
    completion_tokens = result["generation_tokens"]

    finish_reason = "stop"
    if completion_tokens >= req.max_tokens:
        finish_reason = "length"

    return {
        "id": request_id,
        "object": "chat.completion",
        "created": int(time.time()),
        "model": req.model,
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": output
                },
                "finish_reason": finish_reason,
                "index": 0
            }
        ],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens
        }
    }


def stream_chat(model, tokenizer, prompt, req, request_id):
    sampler = build_sampler(req)
    conv_id = req.conversation_id


    def generator():
        buffer = ""
        last_response = None
        sent_len = 0   # 防重复输出

        for response in stream_generate(
            model, 
            tokenizer, 
            prompt, 
            max_tokens=req.max_tokens, 
            sampler=sampler
        ):
            last_response = response

            text = response.text
            buffer += text

            # stop 检测
            if req.stop:
                for stop_word in req.stop:
                    if stop_word in buffer:
                        final = buffer.split(stop_word)[0]
                        new_part = final[sent_len:]

                        if new_part:
                            yield f"data: {json.dumps({
                                'id': request_id,
                                'object': 'chat.completion.chunk',
                                'choices': [{
                                    'delta': {'content': new_part},
                                    'index': 0,
                                    'finish_reason': None
                                }]
                            }, ensure_ascii=False)}\n\n"

                        # usage
                        usage = {
                            "prompt_tokens": last_response.prompt_tokens,
                            "completion_tokens": last_response.generation_tokens,
                            "total_tokens": last_response.prompt_tokens + last_response.generation_tokens
                        }

                        yield f"data: {json.dumps({
                            'id': request_id,
                            'object': 'chat.completion.chunk',
                            'choices': [{
                                'delta': {},
                                'index': 0,
                                'finish_reason': 'stop'
                            }],
                            'usage': usage
                        }, ensure_ascii=False)}\n\n"

                        yield "data: [DONE]\n\n"
                        return

            # 正常输出
            yield f"data: {json.dumps({
                'id': request_id,
                'object': 'chat.completion.chunk',
                'choices': [{
                    'delta': {'content': text},
                    'index': 0,
                    'finish_reason': None
                }]
            }, ensure_ascii=False)}\n\n"

            sent_len = len(buffer)

        if last_response:
            usage = {
                "prompt_tokens": last_response.prompt_tokens,
                "completion_tokens": last_response.generation_tokens,
                "total_tokens": last_response.prompt_tokens + last_response.generation_tokens
            }
        else:
            usage = None

        yield f"data: {json.dumps({
            'id': request_id,
            'object': 'chat.completion.chunk',
            'choices': [{
                'delta': {},
                'index': 0,
                'finish_reason': 'stop'
            }],
            'usage': usage
        }, ensure_ascii=False)}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(generator(), media_type="text/event-stream")


@app.post("/v1/chat/completions")
def chat_completions(req: ChatCompletionRequest):
    try:
        model, tokenizer = get_model(req.model)
        request_id = f"chatcmpl-{uuid.uuid4().hex[:24]}"
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "message": str(e),
                    "type": "invalid_request_error"
                }
            }
        )

    prompt = build_prompt(
        tokenizer,
        req.messages,
        system_prompt=req.system_prompt
    )

    if req.stream:
        return stream_chat(model, tokenizer, prompt, req, request_id)
    else:
        return normal_chat(model, tokenizer, prompt, req, request_id)
    

@app.get("/api/modellist")
async def list_models():
    """
    返回与 Ollama 格式兼容的模型列表。
    Node 层无需改变解析逻辑。
    """
    scanned = scan_models()
    if scanned:
        return scanned
    # fallback 手动列表（建议保持更新，以防自动扫描失效）
    return [
        "mlx-community/Qwen3.5-9B-MLX-4bit"
    ]