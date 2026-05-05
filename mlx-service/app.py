# app.py

from fastapi import FastAPI
from pydantic import BaseModel
from models import get_model, scan_models
from fastapi.responses import StreamingResponse
from mlx_lm.sample_utils import make_sampler
from mlx_lm import generate, stream_generate
import json, time, uuid, logging, asyncio
from fastapi import HTTPException
from typing import Union, List
from pydantic import BaseModel, model_validator
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
DEFAULT_SYSTEM_PROMPT = "role: assistant"

app = FastAPI()

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    # 打印详细的验证错误
    print("\n" + "="*50)
    print("请求验证失败 (422):")
    print("错误详情:", exc.errors())
    # 尝试读取原始请求体
    try:
        body = await request.body()
        print("原始请求体:", body.decode())
    except:
        print("无法读取请求体")
    print("="*50 + "\n")
    # 返回标准错误响应（可以保持原有格式）
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

class ContentPart(BaseModel):
    type: str
    text: str | None = None
    # 可以按需扩展 image_url 等字段

class ChatMessage(BaseModel):
    role: str
    content: Union[str, List[ContentPart]]

    @model_validator(mode='after')
    def extract_text_content(self):
        """将 content 中的文本部分提取为字符串，方便后续使用"""
        if isinstance(self.content, str):
            return self  # 已经是字符串，无需处理
        # 处理数组格式：提取所有 type="text" 的 text 内容
        texts = []
        for part in self.content:
            if part.type == "text" and part.text:
                texts.append(part.text)
        # 将提取后的文本保存回 content
        self.content = "\n".join(texts)
        return self

class ChatCompletionRequest(BaseModel):
    conversation_id: str | None = None
    model: str
    messages: list[ChatMessage]

    temperature: float = 0.7
    top_p: float = 0.9
    top_k: int = 40
    max_tokens: int = 2048

    stream: bool = False
    system_prompt: str | None = None
    think: bool = True 
    class Config:
        extra = "ignore" 


def build_prompt(tokenizer, messages, system_prompt=None, think=True):
    msgs = inject_system_prompt(messages, system_prompt)

    return tokenizer.apply_chat_template(
        msgs,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=think
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

    # 计算输入 token 数
    prompt_tokens = len(tokenizer.encode(prompt))

    # 生成回复（返回纯字符串）
    output = generate(
        model,
        tokenizer,
        prompt=prompt,
        sampler=sampler,
        max_tokens=req.max_tokens
    )

    # 计算输出 token 数
    completion_tokens = len(tokenizer.encode(output))
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
    # conv_id = req.conversation_id


    def generator():
        buffer = ""
        last_response = None

        for response in stream_generate(
            model,
            tokenizer,
            prompt,
            max_tokens=req.max_tokens,
            sampler=sampler
        ):
            last_response = response

            text = response.text
            
            # 跳过空内容
            if not text:
                continue
                
            buffer += text

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
    
    # logging.info(f"{req}")
    # 只能给openclaw单独一个模型来写死think=false
    # req.think = False

    prompt = build_prompt(
        tokenizer,
        req.messages,
        system_prompt=req.system_prompt,
        think=req.think
    )

    if req.stream:
        return stream_chat(model, tokenizer, prompt, req, request_id)
    else:
        return normal_chat(model, tokenizer, prompt, req, request_id)
    

@app.get("/api/modellist")
async def list_models():
    # return model list
    scanned = scan_models()
    if scanned:
        return scanned
    # fallback static list
    return [
        "mlx-community/Qwen3.5-9B-MLX-4bit"
    ]