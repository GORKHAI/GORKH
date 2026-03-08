# Local LLM Support (Iteration 30)

AI Operator supports running local language models via OpenAI-compatible endpoints. This allows you to use models like Qwen entirely on your own machine without sending data to cloud services.

## Overview

**Privacy Benefits:**
- Screenshots never leave your computer
- No API keys required for cloud services
- Works entirely offline (after initial setup)

**Requirements:**
- A machine capable of running the LLM (see model requirements)
- Sufficient RAM (typically 8GB+ for 7B models, 16GB+ for larger)
- An OpenAI-compatible server running locally

## Supported Local Models

### Recommended: Qwen 2.5

[Qwen 2.5](https://github.com/QwenLM/Qwen) is Alibaba's large language model series with strong multimodal capabilities and excellent performance on tool use tasks.

**Recommended models:**
- `Qwen/Qwen2.5-7B-Instruct` - Good balance of capability and resource usage
- `Qwen/Qwen2.5-14B-Instruct` - Better quality, requires more RAM/VRAM
- `Qwen/Qwen2.5-VL-7B-Instruct` - Vision-language model for screenshot understanding

### Other Compatible Models

Any model that supports the OpenAI Chat Completions API should work:

- Llama 3.x series (via llama.cpp)
- Mistral 7B / Mixtral
- Phi-4
- Gemma 2
- Custom fine-tuned models

## Server Options

You need to run a local server that exposes an OpenAI-compatible `/v1/chat/completions` endpoint.

### Option 1: vLLM (Recommended)

[vLLM](https://github.com/vllm-project/vllm) is a high-throughput inference engine optimized for serving LLMs.

**Installation:**
```bash
pip install vllm
```

**Run Qwen:**
```bash
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct \
  --host 127.0.0.1 \
  --port 8000 \
  --dtype auto
```

**With GPU:**
```bash
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2.5-7B-Instruct \
  --host 127.0.0.1 \
  --port 8000 \
  --tensor-parallel-size 1 \
  --gpu-memory-utilization 0.9
```

**Verify it's working:**
```bash
curl http://127.0.0.1:8000/v1/models
```

### Option 2: llama.cpp Server

[llama.cpp](https://github.com/ggerganov/llama.cpp) is optimized for CPU and Apple Silicon inference.

**Download llama.cpp:**
```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make  # or make LLAMA_CUDA=1 for CUDA
```

**Download a GGUF model:**
Download a Qwen GGUF model from Hugging Face (e.g., from [bartowski](https://huggingface.co/bartowski)).

**Run server:**
```bash
./server \
  -m qwen2.5-7b-instruct-Q4_K_M.gguf \
  --host 127.0.0.1 \
  --port 8000 \
  -c 4096
```

The llama.cpp server automatically exposes an OpenAI-compatible API.

### Option 3: Ollama (with OpenAI compatibility)

[Ollama](https://ollama.com/) makes running models easy but requires an extra proxy for OpenAI compatibility.

**Install and run:**
```bash
ollama run qwen2.5:7b
```

**Note:** Ollama's native API is not OpenAI-compatible. You need to use a proxy or configure Ollama's experimental OpenAI compatibility:

```bash
OLLAMA_ORIGINS=* ollama serve
```

Then access at `http://127.0.0.1:11434/v1/chat/completions`.

## Desktop Configuration

1. Open AI Operator Desktop
2. Go to **Settings** (gear icon)
3. Under **AI Assist Configuration**:
   - **Provider**: Select "Local (OpenAI-compatible)"
   - **Base URL**: `http://127.0.0.1:8000` (or your server port)
   - **Model**: `qwen2.5-7b-instruct` (or your model name)
4. Click **Test Connection**

### Settings Reference

| Setting | OpenAI (Cloud) | Local (OpenAI-compatible) |
|---------|---------------|---------------------------|
| Provider | OpenAI | Local |
| Base URL | `https://api.openai.com` | `http://127.0.0.1:8000` |
| Model | `gpt-4.1-mini` | `qwen2.5-7b-instruct` |
| API Key | Required | Optional (rarely needed) |

## Troubleshooting

### "Local server not reachable"

1. Verify your server is running:
   ```bash
   curl http://127.0.0.1:8000/v1/models
   ```

2. Check the port matches between your server and AI Operator settings

3. Ensure no firewall is blocking localhost connections

### "Failed to parse response"

- The server may not support vision/multimodal inputs (screenshots)
- Try with vision-capable models like Qwen2.5-VL

### Out of Memory

- Use a smaller model (7B instead of 14B)
- Use quantized models (Q4_K_M, Q5_K_M)
- Reduce context length (`--max-model-len 2048` in vLLM)
- Close other applications

### Slow Responses

- Use GPU acceleration if available
- Ensure model is loaded into VRAM (not RAM)
- Consider a smaller/faster model for initial testing

## Privacy & Security

**Local-Only Benefits:**
- ✅ Screenshots never leave your machine
- ✅ No cloud API calls
- ✅ No API keys to manage (mostly)
- ✅ Works offline

**Considerations:**
- Model weights are large (4-8GB download)
- Initial model loading can be slow
- CPU inference is significantly slower than GPU

## Advanced: Optional Authentication

Some local servers support optional API key authentication. If your server requires this:

1. Enter the key in the API Key field (even for Local provider)
2. The key will be stored securely in your OS keychain
3. Most local servers don't require this - only set if your server logs show 401 errors

## Comparison: Cloud vs Local

| Feature | OpenAI (Cloud) | Local Model |
|---------|---------------|-------------|
| Setup | Easy (just API key) | Complex (server setup) |
| Cost | Per-token pricing | Free (after hardware) |
| Speed | Fast | Depends on hardware |
| Privacy | Data leaves device | Fully private |
| Quality | Best-in-class | Good, varies by model |
| Offline | No | Yes |
| Vision | Excellent | Model-dependent |

## Next Steps

1. Choose your preferred server (vLLM recommended for GPU, llama.cpp for CPU/Apple Silicon)
2. Download and start the model
3. Configure AI Operator Desktop to use the local endpoint
4. Test with a simple goal like "Open Calculator"

For help with specific models or servers, refer to their respective documentation:
- [vLLM Documentation](https://docs.vllm.ai/)
- [llama.cpp Documentation](https://github.com/ggerganov/llama.cpp/blob/master/README.md)
- [Qwen Documentation](https://qwen.readthedocs.io/)
