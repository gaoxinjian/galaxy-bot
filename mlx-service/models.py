# models.py

import threading, time
from mlx_lm import load
from pathlib import Path

MLX_MODELS_DIR = Path.home() / ".cache/huggingface/hub"

class ModelManager:
    """
    线程安全的模型单例缓存。

    - 懒加载：只在首次请求时加载模型。
    - 并发保护：同一模型不会被多个请求同时加载。
    - 状态查询：可检查模型是否已加载。
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._models: dict[str, tuple] = {}   # name -> (model, tokenizer)
        self._loading: set[str] = set()       # 正在加载中的模型名

    def get_model(self, name: str):
        """
        返回 (model, tokenizer)。若模型未加载，则阻塞直到加载完成。
        """
        # 快速路径：已加载，无锁返回
        if name in self._models:
            return self._models[name]

        with self._lock:
            # 双重检查，避免重复加载
            if name in self._models:
                return self._models[name]

            # 如果另一个线程正在加载同一个模型，等待它完成
            if name in self._loading:
                # 释放锁，等待一小段时间后重试（简单自旋）
                # 生产环境可用 threading.Condition，这里为了保持依赖简洁采用 sleep
                while name not in self._models:
                    time.sleep(0.1)
                return self._models[name]

            # 标记为加载中
            self._loading.add(name)
            try:
                print(f"🔄 Loading model: {name}")
                model, tokenizer = load(name)
                self._models[name] = (model, tokenizer)
                print(f"✅ Model loaded: {name}")
                return self._models[name]
            except Exception as e:
                raise RuntimeError(f"Failed to load model '{name}': {e}") from e
            finally:
                # 无论成功失败，清除加载标记
                self._loading.discard(name)

    def unload_model(self, name: str | None = None):
        """
        释放模型显存。
        - 不传参数：卸载所有模型。
        - 传入模型名：卸载指定模型。
        """
        with self._lock:
            if name is None:
                names = list(self._models.keys())
                for n in names:
                    self._unload_locked(n)
            else:
                self._unload_locked(name)

    def _unload_locked(self, name: str):
        if name in self._models:
            del self._models[name]
            print(f"🗑️  Unloaded model: {name}")
            # 可选：手动触发垃圾回收，帮助释放 GPU 显存
            import gc
            gc.collect()
            try:
                import mlx.core as mx
                mx.metal.clear_cache()
            except Exception:
                pass

    def is_loaded(self, name: str) -> bool:
        """检查模型是否已加载。"""
        return name in self._models

    def loaded_models(self) -> list[str]:
        """返回当前已加载的所有模型名。"""
        return list(self._models.keys())

    def model_info(self, name: str) -> dict | None:
        """获取模型基本信息（模型对象和分词器类型）。"""
        if name in self._models:
            model, tokenizer = self._models[name]
            return {
                "name": name,
                "model_type": type(model).__name__,
                "tokenizer_type": type(tokenizer).__name__,
            }
        return None


# 全局单例，供 app.py 使用
model_manager = ModelManager()

def get_model(name: str):
    """
    兼容旧接口，实际委托给 ModelManager。
    """
    return model_manager.get_model(name)

def scan_models():
    models = []
    print(f"🔍 Scanning models in {MLX_MODELS_DIR.iterdir()}...")
    if MLX_MODELS_DIR.exists():
        for d in MLX_MODELS_DIR.iterdir():
            if not d.is_dir():
                continue
            name = d.name
            # 缓存目录格式：models--{org}--{repo}
            if name.startswith("models--"):
                # 提取 org/repo
                parts = name[len("models--"):].split("--")
                if len(parts) >= 2:
                    org = parts[0]
                    repo = "--".join(parts[1:])  # 兼容 repo 名里含 "--" 的情况
                    repo_id = f"{org}/{repo}"
                    models.append(repo_id)
                else:
                    # 格式不标准，跳过去
                    continue
            # 你也可以兼容其他命名方式，比如直接以 repo_id 命名的目录
            elif "/" in name:
                models.append(name)

    return models