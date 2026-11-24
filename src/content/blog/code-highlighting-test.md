---
title: "代码高亮测试"
description: "测试各种编程语言的代码高亮效果，包括 Python、JavaScript、C++、CUDA 等"
publishDate: 2024-01-12
tags: ["测试", "代码高亮", "编程语言"]
author: "LLM Engineer"
draft: true
---

本文测试各种编程语言的代码高亮效果。

## Python 代码

### 基础 Python 代码
```python
import numpy as np
import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModel

class TransformerModel(nn.Module):
    def __init__(self, model_name: str, num_classes: int):
        super().__init__()
        self.backbone = AutoModel.from_pretrained(model_name)
        self.classifier = nn.Linear(self.backbone.config.hidden_size, num_classes)
        
    def forward(self, input_ids, attention_mask=None):
        outputs = self.backbone(input_ids, attention_mask=attention_mask)
        pooled_output = outputs.pooler_output
        return self.classifier(pooled_output)

# 初始化模型
model = TransformerModel("bert-base-uncased", num_classes=2)
tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")

# 示例训练循环
def train_epoch(model, dataloader, optimizer, criterion):
    model.train()
    total_loss = 0
    
    for batch_idx, (texts, labels) in enumerate(dataloader):
        # 编码文本
        encoded = tokenizer(
            texts, 
            padding=True, 
            truncation=True, 
            return_tensors="pt",
            max_length=512
        )
        
        # 前向传播
        outputs = model(encoded['input_ids'], encoded['attention_mask'])
        loss = criterion(outputs, labels)
        
        # 反向传播
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        
        total_loss += loss.item()
        
        if batch_idx % 100 == 0:
            print(f'Batch {batch_idx}, Loss: {loss.item():.4f}')
    
    return total_loss / len(dataloader)
```

### PPO 算法实现
```python
import torch
import torch.nn.functional as F
from torch.distributions import Categorical

class PPOAgent:
    def __init__(self, policy_net, value_net, lr=3e-4, eps_clip=0.2):
        self.policy_net = policy_net
        self.value_net = value_net
        self.optimizer = torch.optim.Adam(
            list(policy_net.parameters()) + list(value_net.parameters()),
            lr=lr
        )
        self.eps_clip = eps_clip
        
    def compute_advantages(self, rewards, values, gamma=0.99, lambda_=0.95):
        """计算 GAE 优势函数"""
        advantages = []
        gae = 0
        
        for i in reversed(range(len(rewards))):
            delta = rewards[i] + gamma * values[i+1] - values[i]
            gae = delta + gamma * lambda_ * gae
            advantages.insert(0, gae)
            
        return torch.tensor(advantages, dtype=torch.float32)
    
    def update(self, states, actions, old_log_probs, rewards, values):
        """PPO 更新"""
        advantages = self.compute_advantages(rewards, values)
        advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)
        
        for _ in range(4):  # PPO epochs
            # 新的策略输出
            logits = self.policy_net(states)
            dist = Categorical(F.softmax(logits, dim=-1))
            new_log_probs = dist.log_prob(actions)
            
            # 重要性采样比率
            ratio = torch.exp(new_log_probs - old_log_probs)
            
            # PPO 剪切损失
            surr1 = ratio * advantages
            surr2 = torch.clamp(ratio, 1 - self.eps_clip, 1 + self.eps_clip) * advantages
            policy_loss = -torch.min(surr1, surr2).mean()
            
            # 价值函数损失
            new_values = self.value_net(states).squeeze()
            value_loss = F.mse_loss(new_values, rewards + advantages)
            
            # 总损失
            total_loss = policy_loss + 0.5 * value_loss
            
            self.optimizer.zero_grad()
            total_loss.backward()
            self.optimizer.step()
```

## JavaScript/TypeScript 代码

### React 组件
```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';

interface SearchProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  placeholder?: string;
  delay?: number;
}

interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
}

const SearchComponent: React.FC<SearchProps> = ({ 
  onSearch, 
  placeholder = "搜索...", 
  delay = 300 
}) => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 防抖搜索函数
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const searchResults = await onSearch(searchQuery);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : '搜索失败');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, delay),
    [onSearch, delay]
  );

  useEffect(() => {
    debouncedSearch(query);
    return () => debouncedSearch.cancel();
  }, [query, debouncedSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div className="search-container">
      <div className="search-input-wrapper">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="search-input"
        />
        {loading && <div className="search-spinner">🔄</div>}
      </div>
      
      {error && (
        <div className="search-error">
          错误: {error}
        </div>
      )}
      
      <div className="search-results">
        {results.map((result) => (
          <div key={result.id} className="search-result-item">
            <h3>{result.title}</h3>
            <p>{result.description}</p>
            <a href={result.url} target="_blank" rel="noopener noreferrer">
              查看详情
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchComponent;
```

### Node.js API
```javascript
const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// 安全中间件
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// 限流中间件
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 最多100次请求
  message: '请求过于频繁，请稍后再试'
});

app.use('/api/', apiLimiter);

// 模型推理 API
app.post('/api/inference',
  [
    body('text').isString().isLength({ min: 1, max: 1000 }),
    body('model').optional().isString(),
    body('temperature').optional().isFloat({ min: 0, max: 2 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { text, model = 'gpt-3.5-turbo', temperature = 0.7 } = req.body;

    try {
      // 模拟 LLM 推理
      const response = await callLLMAPI({
        prompt: text,
        model: model,
        temperature: temperature,
        max_tokens: 500
      });

      res.json({
        success: true,
        data: {
          text: response.text,
          usage: response.usage,
          model: model
        }
      });
    } catch (error) {
      console.error('推理错误:', error);
      res.status(500).json({
        success: false,
        error: '模型推理失败'
      });
    }
  }
);

async function callLLMAPI(params) {
  // 这里是实际的 LLM API 调用逻辑
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        text: `AI回复: ${params.prompt}`,
        usage: { prompt_tokens: 10, completion_tokens: 20 }
      });
    }, 1000);
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
```

## C++ 代码

### CUDA 矩阵乘法
```cpp
#include <cuda_runtime.h>
#include <cublas_v2.h>
#include <iostream>
#include <vector>
#include <chrono>

// CUDA 核函数：朴素矩阵乘法
__global__ void matmul_naive(const float* A, const float* B, float* C, 
                            int M, int N, int K) {
    int row = blockIdx.y * blockDim.y + threadIdx.y;
    int col = blockIdx.x * blockDim.x + threadIdx.x;
    
    if (row < M && col < N) {
        float sum = 0.0f;
        for (int k = 0; k < K; ++k) {
            sum += A[row * K + k] * B[k * N + col];
        }
        C[row * N + col] = sum;
    }
}

// 使用共享内存的优化版本
__global__ void matmul_shared(const float* A, const float* B, float* C,
                             int M, int N, int K) {
    const int TILE_SIZE = 16;
    __shared__ float As[TILE_SIZE][TILE_SIZE];
    __shared__ float Bs[TILE_SIZE][TILE_SIZE];
    
    int row = blockIdx.y * TILE_SIZE + threadIdx.y;
    int col = blockIdx.x * TILE_SIZE + threadIdx.x;
    int tx = threadIdx.x;
    int ty = threadIdx.y;
    
    float sum = 0.0f;
    
    for (int tile = 0; tile < (K + TILE_SIZE - 1) / TILE_SIZE; ++tile) {
        // 加载数据到共享内存
        int a_col = tile * TILE_SIZE + tx;
        int b_row = tile * TILE_SIZE + ty;
        
        As[ty][tx] = (row < M && a_col < K) ? A[row * K + a_col] : 0.0f;
        Bs[ty][tx] = (b_row < K && col < N) ? B[b_row * N + col] : 0.0f;
        
        __syncthreads();
        
        // 计算部分乘积
        for (int k = 0; k < TILE_SIZE; ++k) {
            sum += As[ty][k] * Bs[k][tx];
        }
        
        __syncthreads();
    }
    
    if (row < M && col < N) {
        C[row * N + col] = sum;
    }
}

class GPUMatMul {
private:
    cublasHandle_t cublas_handle;
    float *d_A, *d_B, *d_C;
    int M, N, K;
    
public:
    GPUMatMul(int m, int n, int k) : M(m), N(n), K(k) {
        // 初始化 cuBLAS
        cublasCreate(&cublas_handle);
        
        // 分配 GPU 内存
        cudaMalloc(&d_A, M * K * sizeof(float));
        cudaMalloc(&d_B, K * N * sizeof(float));
        cudaMalloc(&d_C, M * N * sizeof(float));
        
        // 检查 CUDA 错误
        checkCudaError();
    }
    
    ~GPUMatMul() {
        cudaFree(d_A);
        cudaFree(d_B);
        cudaFree(d_C);
        cublasDestroy(cublas_handle);
    }
    
    void compute_cublas(const std::vector<float>& A, const std::vector<float>& B,
                       std::vector<float>& C) {
        // 复制数据到 GPU
        cudaMemcpy(d_A, A.data(), M * K * sizeof(float), cudaMemcpyHostToDevice);
        cudaMemcpy(d_B, B.data(), K * N * sizeof(float), cudaMemcpyHostToDevice);
        
        const float alpha = 1.0f, beta = 0.0f;
        
        // cuBLAS 矩阵乘法：C = alpha * A * B + beta * C
        cublasSgemm(cublas_handle, CUBLAS_OP_N, CUBLAS_OP_N,
                   N, M, K,
                   &alpha,
                   d_B, N,
                   d_A, K,
                   &beta,
                   d_C, N);
        
        // 复制结果回 CPU
        cudaMemcpy(C.data(), d_C, M * N * sizeof(float), cudaMemcpyDeviceToHost);
        
        checkCudaError();
    }
    
    void compute_custom(const std::vector<float>& A, const std::vector<float>& B,
                       std::vector<float>& C) {
        // 复制数据到 GPU
        cudaMemcpy(d_A, A.data(), M * K * sizeof(float), cudaMemcpyHostToDevice);
        cudaMemcpy(d_B, B.data(), K * N * sizeof(float), cudaMemcpyHostToDevice);
        
        // 启动核函数
        dim3 blockSize(16, 16);
        dim3 gridSize((N + blockSize.x - 1) / blockSize.x,
                     (M + blockSize.y - 1) / blockSize.y);
        
        matmul_shared<<<gridSize, blockSize>>>(d_A, d_B, d_C, M, N, K);
        
        // 复制结果回 CPU
        cudaMemcpy(C.data(), d_C, M * N * sizeof(float), cudaMemcpyDeviceToHost);
        
        checkCudaError();
    }
    
private:
    void checkCudaError() {
        cudaError_t error = cudaGetLastError();
        if (error != cudaSuccess) {
            throw std::runtime_error("CUDA 错误: " + std::string(cudaGetErrorString(error)));
        }
    }
};

// 性能测试
int main() {
    const int M = 1024, N = 1024, K = 1024;
    
    // 初始化数据
    std::vector<float> A(M * K), B(K * N), C_cublas(M * N), C_custom(M * N);
    
    // 随机初始化
    std::srand(42);
    for (int i = 0; i < M * K; ++i) A[i] = static_cast<float>(std::rand()) / RAND_MAX;
    for (int i = 0; i < K * N; ++i) B[i] = static_cast<float>(std::rand()) / RAND_MAX;
    
    GPUMatMul gpu_matmul(M, N, K);
    
    // 测试 cuBLAS
    auto start = std::chrono::high_resolution_clock::now();
    gpu_matmul.compute_cublas(A, B, C_cublas);
    auto end = std::chrono::high_resolution_clock::now();
    auto cublas_time = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    
    // 测试自定义实现
    start = std::chrono::high_resolution_clock::now();
    gpu_matmul.compute_custom(A, B, C_custom);
    end = std::chrono::high_resolution_clock::now();
    auto custom_time = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    
    std::cout << "cuBLAS 时间: " << cublas_time.count() << " μs" << std::endl;
    std::cout << "自定义实现时间: " << custom_time.count() << " μs" << std::endl;
    
    return 0;
}
```

## Shell 脚本

### 部署脚本
```bash
#!/bin/bash

# 模型部署脚本
set -euo pipefail

# 配置变量
MODEL_NAME="${1:-llama-7b}"
DEPLOYMENT_ENV="${2:-staging}"
VERSION="${3:-latest}"
DOCKER_REGISTRY="your-registry.com"
NAMESPACE="llm-inference"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    commands=("docker" "kubectl" "helm")
    for cmd in "${commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "$cmd 未安装"
            exit 1
        fi
    done
    
    log_info "依赖检查完成"
}

# 构建 Docker 镜像
build_image() {
    log_info "构建 Docker 镜像..."
    
    IMAGE_TAG="${DOCKER_REGISTRY}/${MODEL_NAME}:${VERSION}"
    
    docker build \
        --build-arg MODEL_NAME="${MODEL_NAME}" \
        --build-arg VERSION="${VERSION}" \
        -t "${IMAGE_TAG}" \
        -f docker/Dockerfile .
    
    log_info "镜像构建完成: ${IMAGE_TAG}"
    
    # 推送镜像
    docker push "${IMAGE_TAG}"
    log_info "镜像推送完成"
}

# 部署到 Kubernetes
deploy_to_k8s() {
    log_info "部署到 Kubernetes..."
    
    # 创建命名空间（如果不存在）
    kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -
    
    # 使用 Helm 部署
    helm upgrade --install "${MODEL_NAME}" \
        ./helm/llm-inference \
        --namespace "${NAMESPACE}" \
        --set image.repository="${DOCKER_REGISTRY}/${MODEL_NAME}" \
        --set image.tag="${VERSION}" \
        --set environment="${DEPLOYMENT_ENV}" \
        --set model.name="${MODEL_NAME}" \
        --timeout 600s
    
    log_info "部署完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    SERVICE_URL="http://$(kubectl get svc ${MODEL_NAME} -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}'):8000"
    
    # 等待服务就绪
    for i in {1..30}; do
        if curl -f "${SERVICE_URL}/health" &> /dev/null; then
            log_info "服务健康检查通过"
            break
        fi
        
        if [ $i -eq 30 ]; then
            log_error "服务健康检查失败"
            exit 1
        fi
        
        log_warn "等待服务就绪... ($i/30)"
        sleep 10
    done
    
    # 测试推理接口
    log_info "测试推理接口..."
    curl -X POST "${SERVICE_URL}/inference" \
        -H "Content-Type: application/json" \
        -d '{"text": "测试输入", "max_tokens": 50}' \
        | jq .
}

# 清理函数
cleanup() {
    if [ $? -ne 0 ]; then
        log_error "部署失败，执行清理..."
        helm uninstall "${MODEL_NAME}" -n "${NAMESPACE}" || true
    fi
}

# 主函数
main() {
    log_info "开始部署 ${MODEL_NAME} (${VERSION}) 到 ${DEPLOYMENT_ENV} 环境"
    
    trap cleanup EXIT
    
    check_dependencies
    build_image
    deploy_to_k8s
    health_check
    
    log_info "部署成功完成！"
    log_info "服务访问地址: ${SERVICE_URL}"
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
```

## SQL 查询

### 复杂分析查询
```sql
-- 用户行为分析查询
WITH user_sessions AS (
    SELECT 
        user_id,
        session_id,
        DATE(created_at) as session_date,
        COUNT(*) as interaction_count,
        AVG(response_time) as avg_response_time,
        SUM(CASE WHEN feedback_score >= 4 THEN 1 ELSE 0 END) as positive_feedback
    FROM user_interactions 
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY user_id, session_id, DATE(created_at)
),
daily_metrics AS (
    SELECT 
        session_date,
        COUNT(DISTINCT user_id) as daily_active_users,
        COUNT(DISTINCT session_id) as total_sessions,
        AVG(interaction_count) as avg_interactions_per_session,
        AVG(avg_response_time) as avg_response_time,
        SUM(positive_feedback) * 100.0 / SUM(interaction_count) as satisfaction_rate
    FROM user_sessions
    GROUP BY session_date
),
model_performance AS (
    SELECT 
        model_version,
        DATE(created_at) as usage_date,
        COUNT(*) as total_requests,
        AVG(latency_ms) as avg_latency,
        AVG(token_count) as avg_tokens,
        SUM(CASE WHEN error_code IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
    FROM model_requests 
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY model_version, DATE(created_at)
)
SELECT 
    dm.session_date,
    dm.daily_active_users,
    dm.total_sessions,
    ROUND(dm.avg_interactions_per_session, 2) as avg_interactions,
    ROUND(dm.avg_response_time, 2) as avg_response_time_sec,
    ROUND(dm.satisfaction_rate, 2) as satisfaction_rate_pct,
    mp.model_version,
    mp.total_requests,
    ROUND(mp.avg_latency, 2) as avg_latency_ms,
    ROUND(mp.success_rate, 2) as success_rate_pct
FROM daily_metrics dm
LEFT JOIN model_performance mp ON dm.session_date = mp.usage_date
ORDER BY dm.session_date DESC, mp.total_requests DESC;

-- 模型A/B测试分析
SELECT 
    experiment_group,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_interactions,
    AVG(response_quality_score) as avg_quality_score,
    AVG(user_satisfaction_score) as avg_satisfaction,
    AVG(task_completion_rate) as completion_rate,
    STDDEV(response_quality_score) as quality_stddev,
    -- 统计显著性检验
    (AVG(CASE WHEN experiment_group = 'A' THEN response_quality_score END) - 
     AVG(CASE WHEN experiment_group = 'B' THEN response_quality_score END)) / 
    SQRT(VAR_POP(response_quality_score) * (1.0/COUNT(CASE WHEN experiment_group = 'A' THEN 1 END) + 
                                           1.0/COUNT(CASE WHEN experiment_group = 'B' THEN 1 END))) as t_statistic
FROM ab_test_results 
WHERE experiment_name = 'llm_model_comparison'
    AND created_at >= '2024-01-01'
GROUP BY experiment_group;
```

## 配置文件

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  llm-api:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        MODEL_SIZE: 7b
    ports:
      - "8000:8000"
    environment:
      - MODEL_PATH=/models/llama-7b
      - CUDA_VISIBLE_DEVICES=0,1
      - BATCH_SIZE=16
      - MAX_SEQUENCE_LENGTH=2048
    volumes:
      - ./models:/models:ro
      - ./logs:/app/logs
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 2
              capabilities: [gpu]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru

  monitoring:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'

volumes:
  redis_data:
  prometheus_data:

networks:
  default:
    driver: bridge
```

代码高亮测试完成！支持多种编程语言和语法高亮效果。