---
title: "RLHF: 从人类反馈中学习的强化学习方法"
description: "深入解析RLHF算法原理、实现细节和在大语言模型训练中的应用"
publishDate: 2024-01-15
updateDate: 2026-11-24
tags: ["RLHF", "强化学习", "LLM", "后训练"]
author: "SwordFaith"
katex: true
---

强化学习从人类反馈（Reinforcement Learning from Human Feedback, RLHF）是当前大语言模型后训练的核心技术之一。本文将深入探讨RLHF的算法原理、实现细节以及在实际应用中的挑战。

## 算法原理

RLHF的核心思想是通过人类标注的偏好数据来训练一个奖励模型（Reward Model），然后使用这个奖励模型来指导语言模型的强化学习训练。

### 数学表述

设语言模型为 $\pi_\theta$，奖励模型为 $R_\phi$，则RLHF的目标函数可以表示为：

$$
\max_\theta \mathbb{E}_{x \sim D, y \sim \pi_\theta(\cdot|x)} [R_\phi(x, y)] - \beta \mathbb{KL}[\pi_\theta(\cdot|x) || \pi_0(\cdot|x)]
$$

其中：
- $D$ 是输入数据分布
- $\pi_0$ 是初始的监督微调模型
- $\beta$ 是KL散度的权重系数
- $\mathbb{KL}$ 表示KL散度，用于防止模型偏离初始分布过远

[Ziegler et al. (2019)](https://arxiv.org/abs/1909.08593) 将这一带 KL 惩罚的目标用于语言模型的偏好微调，[InstructGPT](https://arxiv.org/abs/2203.02155) 等后续工作沿用了同样的做法。

## 实现步骤

RLHF的实现通常包含以下三个阶段（例如 [InstructGPT](https://arxiv.org/abs/2203.02155) 的 SFT → 奖励模型 → PPO 流程）。下面的代码均为简化示意，并非完整实现：

### 1. 监督微调（SFT）

首先使用高质量的指令-回答对数据集对预训练模型进行监督微调：

```python
def train_sft(model, dataset):
    optimizer = AdamW(model.parameters(), lr=5e-5)
    
    for batch in dataset:
        inputs, targets = batch
        outputs = model(inputs)
        loss = cross_entropy_loss(outputs, targets)
        
        loss.backward()
        optimizer.step()
        optimizer.zero_grad()
    
    return model
```

### 2. 奖励模型训练

使用人类偏好数据训练奖励模型：

```python
def train_reward_model(reward_model, preference_dataset):
    optimizer = AdamW(reward_model.parameters(), lr=1e-5)
    
    for batch in preference_dataset:
        prompts, chosen, rejected = batch
        
        chosen_reward = reward_model(prompts, chosen)
        rejected_reward = reward_model(prompts, rejected)
        
        # Bradley-Terry模型
        loss = -torch.log(torch.sigmoid(chosen_reward - rejected_reward)).mean()
        
        loss.backward()
        optimizer.step()
        optimizer.zero_grad()
    
    return reward_model
```

### 3. PPO强化学习

使用PPO算法优化语言模型（省略了价值模型、GAE 等细节）。注意 rollout 必须从策略分布中随机采样（不能用贪心解码），`old_log_probs` 也必须按同一个采样分布计算，这样 $\log \frac{\pi_\theta}{\pi_0}$ 在样本上的取值才是 KL 项的估计：

```python
def ppo_training(policy_model, ref_model, reward_model, dataset):
    for epoch in range(num_epochs):
        for batch in dataset:
            prompts = batch
            
            # 生成回答
            with torch.no_grad():
                # Sample (no greedy decoding) so the log-ratio below estimates the KL term
                old_responses = policy_model.generate(prompts, do_sample=True)
                old_log_probs = policy_model.log_prob(prompts, old_responses)
                ref_log_probs = ref_model.log_prob(prompts, old_responses)
                # KL penalty against the SFT reference model, matching the objective above
                rewards = reward_model(prompts, old_responses) - beta * (old_log_probs - ref_log_probs)
            
            # PPO更新
            for _ in range(ppo_epochs):
                new_log_probs = policy_model.log_prob(prompts, old_responses)
                ratio = torch.exp(new_log_probs - old_log_probs)
                
                advantages = compute_advantages(rewards)
                
                # PPO剪切损失
                loss1 = ratio * advantages
                loss2 = torch.clamp(ratio, 1-clip_ratio, 1+clip_ratio) * advantages
                loss = -torch.min(loss1, loss2).mean()
                
                loss.backward()
                optimizer.step()
                optimizer.zero_grad()
    
    return policy_model
```

## 关键挑战

### 1. 奖励黑客攻击

模型可能学会利用奖励模型的漏洞来获得高分，而不是真正改善输出质量。

**解决方案**：
- 定期更新奖励模型（如 [Bai et al. (2022)](https://arxiv.org/abs/2204.05862) 按周用新的人类反馈迭代更新偏好模型和策略）
- 使用多个独立的奖励模型（如 [Coste et al. (2023)](https://arxiv.org/abs/2310.02743) 的奖励模型集成）
- 引入宪法AI等约束机制

### 2. 分布偏移

强化学习过程中模型分布可能偏离初始分布过远，导致性能下降。

**解决方案**：
- 适当设置KL散度惩罚系数 $\beta$
- 使用动态调整的 $\beta$ 值（如 [Ziegler et al. (2019)](https://arxiv.org/abs/1909.08593) 按目标 KL 自适应调节 $\beta$）
- 定期与参考模型进行对齐

### 3. 计算复杂度

RLHF训练需要同时维护多个模型，计算开销较大。

**解决方案**：
- 使用模型并行化训练
- 采用轻量化的奖励模型
- 优化采样和推理流程

## 实际应用效果

以 [InstructGPT（Ouyang et al., 2022）](https://arxiv.org/abs/2203.02155) 为例，论文报告 RLHF 在以下方面带来了改善：

1. **有用性**：在其 prompt 分布上的人工评估中，1.3B 参数的 InstructGPT 的输出比 175B 的 GPT-3 更受偏好
2. **无害性**：在 RealToxicityPrompts 上，被要求以尊重的方式回答时，InstructGPT 比 GPT-3 生成更少的有害（toxic）内容；去掉这一要求后，这一优势消失。偏见方面没有改善
3. **诚实性**：TruthfulQA 上的真实性有所提升；在其 API prompt 分布的封闭域任务中，幻觉率从 GPT-3 的 41% 降到 21%

[Bai et al. (2022)](https://arxiv.org/abs/2204.05862) 也用 RLHF 训练了有用且无害的对话助手。

## 总结

RLHF作为当前最重要的大语言模型对齐技术，在理论和实践上都取得了重要进展。未来的研究方向包括：

- 更高效的人类反馈收集方法
- 更稳定的训练算法
- 更好的奖励模型设计
- 与其他对齐技术的结合

通过持续的技术创新，RLHF将继续推动大语言模型朝着更安全、更有用的方向发展。