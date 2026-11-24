---
title: "DPO vs RLHF: 直接偏好优化的优势与局限"
description: "对比分析DPO和RLHF两种后训练方法的原理、实现和性能差异"
publishDate: 2024-02-01
updateDate: 2026-11-24
tags: ["DPO", "RLHF", "对比分析", "后训练"]
author: "SwordFaith"
katex: true
---

直接偏好优化（Direct Preference Optimization, DPO）作为RLHF的替代方案，近期在学术界和工业界引起了广泛关注。本文将深入对比这两种方法的优缺点。文中的实验结论都不是笔者自己的实验：“原论文的实验结果”一节总结的是 DPO 原论文（[Rafailov et al., 2023, arXiv:2305.18290](https://arxiv.org/abs/2305.18290)）的结果，其他观察在出现处注明来源。

## DPO算法原理

DPO的核心创新在于直接从偏好数据优化语言模型，无需训练独立的奖励模型。

### 理论基础

DPO基于一个重要观察：RLHF 中带 KL 约束的奖励最大化目标，其最优策略有闭式解。设最优策略为 $\pi^*$，则：

$$
\pi^*(y|x) = \frac{1}{Z(x)} \pi_0(y|x) \exp\left(\frac{1}{\beta} R^*(x,y)\right)
$$

其中 $\pi_0$ 是参考模型（通常是 SFT 模型，原论文记作 $\pi_{\text{ref}}$），$Z(x) = \sum_y \pi_0(y|x) \exp\left(\frac{1}{\beta} R^*(x,y)\right)$ 是配分函数，实际中估计代价很高。对上式取对数并整理，可以把奖励写成最优策略的函数：

$$
R^*(x,y) = \beta \log \frac{\pi^*(y|x)}{\pi_0(y|x)} + \beta \log Z(x)
$$

Bradley-Terry 偏好模型只依赖两个回答的奖励之差，$p^*(y_w \succ y_l \mid x) = \sigma\left(R^*(x,y_w) - R^*(x,y_l)\right)$，代入后 $Z(x)$ 恰好被消掉。用参数化策略 $\pi_\theta$ 代替 $\pi^*$ 并对偏好数据做最大似然，DPO直接优化：

$$
\mathcal{L}_{\text{DPO}}(\pi_\theta) = -\mathbb{E}_{(x,y_w,y_l) \sim \mathcal{D}} \left[ \log \sigma\left( \beta \log \frac{\pi_\theta(y_w|x)}{\pi_0(y_w|x)} - \beta \log \frac{\pi_\theta(y_l|x)}{\pi_0(y_l|x)} \right) \right]
$$

其中 $y_w$ 和 $y_l$ 分别表示偏好和非偏好回答。

原论文把 $\hat{r}_\theta(x,y) = \beta \log \frac{\pi_\theta(y|x)}{\pi_0(y|x)}$ 称为由语言模型隐式定义的奖励，这也是论文标题后半句 "Your Language Model is Secretly a Reward Model" 的含义。这个损失的梯度包含方向相反的两项：沿 $\nabla_\theta \log \pi_\theta(y_w|x)$ 推高偏好回答、沿 $-\nabla_\theta \log \pi_\theta(y_l|x)$ 压低非偏好回答，合起来拉大两者 log 概率比之间的相对差距；整体按 $\sigma\left(\hat{r}_\theta(x,y_l) - \hat{r}_\theta(x,y_w)\right)$ 加权：隐式奖励把这对回答排得越错，权重越大。原论文报告，去掉这个权重的朴素版本可能导致语言模型退化。需要注意，损失只约束相对差距，并不保证 $y_w$ 的绝对似然上升：训练中偏好回答的似然也常常下降，[Razin et al. (2024)](https://arxiv.org/abs/2410.08847) 将这一现象称为 likelihood displacement。

## 关键差异对比

| 维度 | RLHF（PPO） | DPO |
|------|------|-----|
| **训练阶段** | 3阶段（SFT + RM + PPO） | 2阶段（SFT + DPO） |
| **计算复杂度** | 高（训练中需要用当前策略在线生成回答） | 较低（无需采样，只在离线偏好对上计算 log 概率） |
| **训练稳定性** | 较难调稳（RL固有问题；DPO 原论文称 RLHF "complex and often unstable"） | 相对稳定（形式上是一个分类损失） |
| **内存占用** | 大（策略模型+奖励模型+参考模型，PPO 通常还需要价值模型） | 较小（策略模型+参考模型，参考模型的 log 概率可预先算好） |
| **超参敏感度** | 高（PPO 超参、KL 系数等） | 较低（主要超参是 $\beta$；原论文称几乎无需调参） |

## 实现细节对比

### RLHF实现
```python
import copy

# 阶段1: SFT
sft_model = train_sft(base_model, sft_dataset)

# 阶段2: 奖励模型训练
# Separate copy of the SFT model with a scalar reward head, so the policy is not overwritten
reward_model = train_reward_model(add_scalar_head(copy.deepcopy(sft_model)), preference_dataset)

# 阶段3: PPO训练
# Frozen copy of the SFT model as the KL reference; sft_model itself is trained as the policy
ref_model = copy.deepcopy(sft_model).eval().requires_grad_(False)
final_model = ppo_training(sft_model, ref_model, reward_model, prompts)
```

### DPO实现
```python
import copy

# 阶段1: SFT
sft_model = train_sft(base_model, sft_dataset)

# 阶段2: DPO训练
def dpo_loss(model, reference_model, batch):
    chosen_logps = model.log_prob(batch.prompts, batch.chosen)
    rejected_logps = model.log_prob(batch.prompts, batch.rejected)
    
    chosen_ref_logps = reference_model.log_prob(batch.prompts, batch.chosen)
    rejected_ref_logps = reference_model.log_prob(batch.prompts, batch.rejected)
    
    chosen_logits = beta * (chosen_logps - chosen_ref_logps)
    rejected_logits = beta * (rejected_logps - rejected_ref_logps)
    
    return -F.logsigmoid(chosen_logits - rejected_logits).mean()

# Frozen copy of the SFT model as the reference; sft_model itself is trained as the policy
reference_model = copy.deepcopy(sft_model).eval().requires_grad_(False)
final_model = train_dpo(sft_model, reference_model, preference_dataset)
```

## 原论文的实验结果

以下设置和结论均出自 DPO 原论文第 6 节（实验）和第 7 节（讨论），笔者没有复现。

### 实验设置
- **任务与数据**: IMDb 情感可控生成、Reddit TL;DR 摘要、Anthropic HH 单轮对话
- **模型**: 情感任务用 GPT-2-large；摘要任务在 GPT-J 的 SFT 模型上微调；对话任务基于 Pythia-2.8B。论文评估的模型最大为 6B 参数
- **评估方式**: 情感任务有真实奖励（情感分类器），比较奖励与 KL 的权衡前沿；摘要和对话任务用 GPT-4 计算相对参考回答的胜率。论文只在 TL;DR 摘要上做了人工评估来检验 GPT-4 判断与人类判断的一致性，对话任务的胜率没有经过人工验证

### 结果分析

1. **优化效率**
   - 情感任务中，DPO 的奖励–KL 前沿优于 PPO，即使 PPO 能直接使用真实奖励（PPO-GT）

2. **最终性能**
   - TL;DR 摘要：温度为 0 时，DPO 对参考摘要的胜率约 61%，PPO 在其最优温度（同为 0）下约 57%；DPO 对采样温度也更鲁棒
   - Anthropic HH 对话：DPO 是唯一胜过数据集中偏好回答的计算高效方法，效果与计算开销大得多的 Best of 128 相当或更好。论文评估了一个公开的 PPO 模型，但在所试的 prompt 和采样温度下都没能超过 Pythia-2.8B 基座，因此这一任务上用 Best of 128 作为 PPO 水平的粗略代理，没有直接与 PPO 对比

3. **适用范围**
   - 论文只评估到 6B 参数，扩展到更大模型被列为未来工作
   - GPT-4 计算的胜率受评估 prompt 影响；DPO 与基于显式奖励的方法在分布外的泛化比较，论文认为还需要更全面的研究

## 各自优势与局限

### RLHF优势
1. **理论成熟**: 基于强化学习理论基础
2. **灵活性强**: 可以使用复杂的奖励函数
3. **工业验证**: 已在多个大模型中得到验证，如 [InstructGPT](https://arxiv.org/abs/2203.02155) 和 [Anthropic 的 HH 助手](https://arxiv.org/abs/2204.05862)

### RLHF局限
1. **训练复杂**: 三阶段训练，超参数调优困难
2. **计算开销**: 需要维护多个模型
3. **稳定性差**: RL训练容易发散

### DPO优势
1. **简单高效**: 端到端训练，实现简单
2. **训练稳定**: 基于监督学习，收敛性好
3. **资源友好**: 内存和计算需求更低

### DPO局限
1. **理论限制**: 推导依赖 Bradley-Terry（或 Plackett-Luce）偏好模型假设，适用性可能有限
2. **奖励建模**: 只有与策略绑定的隐式奖励，没有可单独使用的奖励模型
3. **调优空间**: 超参数调优选择相对有限

## 选择建议

### 选择RLHF的场景
- 需要在训练中对策略自己的新生成结果持续打分（在线采样）
- 有充足的计算资源
- 需要复杂的奖励函数设计
- 团队有丰富的RL经验

### 选择DPO的场景
- 快速迭代和原型开发
- 计算资源有限
- 追求训练稳定性
- 团队缺乏RL经验

## 未来发展方向

1. **混合方法**: 结合两者优势的新算法
2. **理论完善**: 更深入的理论分析和保证
3. **工程优化**: 更高效的实现和优化技巧
4. **评估标准**: 更全面的评估指标和基准

## 结论

DPO和RLHF各有优劣，选择哪种方法需要根据具体场景和需求来决定。对于大多数应用场景，DPO提供了一个更实用的解决方案，而在需要显式奖励模型和在线采样的场景中，RLHF仍有其价值。

随着技术的不断发展，我们期待看到更多创新的对齐算法，为构建更安全、更有用的AI系统提供支持。
