---
title: "数学公式渲染测试"
description: "测试 KaTeX 数学公式渲染效果，包括行内公式、块级公式和复杂数学表达式"
publishDate: 2024-01-10
tags: ["测试", "数学公式", "KaTeX"]
author: "LLM Engineer"
katex: true
---

# 数学公式渲染测试

本文测试各种数学公式的渲染效果，确保 KaTeX 集成正常工作。

## 基础公式测试

### 行内公式
这是一个行内公式示例：$E = mc^2$，爱因斯坦的质能方程。

另一个行内公式：当 $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$ 时，二次方程 $ax^2 + bx + c = 0$ 的解。

### 块级公式

$$
\frac{\partial}{\partial t} \int_{\Omega} \rho \, d\Omega + \int_{\partial \Omega} \rho \mathbf{v} \cdot \mathbf{n} \, dS = 0
$$

## 机器学习相关公式

### 损失函数
交叉熵损失函数：
$$
\mathcal{L} = -\sum_{i=1}^{N} y_i \log(\hat{y}_i) + (1-y_i) \log(1-\hat{y}_i)
$$

### 梯度下降
参数更新规则：
$$
\theta_{t+1} = \theta_t - \alpha \nabla_\theta \mathcal{L}(\theta_t)
$$

### 注意力机制
Scaled Dot-Product Attention：
$$
\text{Attention}(Q, K, V) = \text{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

### Transformer 位置编码
$$
PE_{(pos, 2i)} = \sin\left(\frac{pos}{10000^{2i/d_{model}}}\right)
$$
$$
PE_{(pos, 2i+1)} = \cos\left(\frac{pos}{10000^{2i/d_{model}}}\right)
$$

## 强化学习公式

### Q-Learning 更新规则
$$
Q(s_t, a_t) \leftarrow Q(s_t, a_t) + \alpha \left[ r_{t+1} + \gamma \max_a Q(s_{t+1}, a) - Q(s_t, a_t) \right]
$$

### PPO 目标函数
$$
L^{CLIP}(\theta) = \hat{\mathbb{E}}_t \left[ \min\left( r_t(\theta) \hat{A}_t, \text{clip}(r_t(\theta), 1-\epsilon, 1+\epsilon) \hat{A}_t \right) \right]
$$

其中 $r_t(\theta) = \frac{\pi_\theta(a_t|s_t)}{\pi_{\theta_{old}}(a_t|s_t)}$

### 策略梯度
$$
\nabla_\theta J(\theta) = \mathbb{E}_{\tau \sim \pi_\theta} \left[ \sum_{t=0}^{T} \nabla_\theta \log \pi_\theta(a_t|s_t) R(\tau) \right]
$$

## 统计学习公式

### 贝叶斯定理
$$
P(A|B) = \frac{P(B|A) P(A)}{P(B)}
$$

### 高斯分布
$$
f(x) = \frac{1}{\sqrt{2\pi\sigma^2}} e^{-\frac{(x-\mu)^2}{2\sigma^2}}
$$

### KL散度
$$
D_{KL}(P||Q) = \int_{-\infty}^{\infty} p(x) \log\left(\frac{p(x)}{q(x)}\right) dx
$$

## 复杂数学表达式

### 矩阵运算
$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}^{-1} = \frac{1}{ad-bc} \begin{pmatrix}
d & -b \\
-c & a
\end{pmatrix}
$$

### 求和与积分
$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

### 分段函数
$$
f(x) = \begin{cases}
x^2 & \text{if } x \geq 0 \\
-x^2 & \text{if } x < 0
\end{cases}
$$

### 矩阵操作
设 $A \in \mathbb{R}^{m \times n}$，$B \in \mathbb{R}^{n \times p}$，则：
$$
(AB)_{ij} = \sum_{k=1}^{n} A_{ik} B_{kj}
$$

## 大型公式测试

### LSTM 门控机制
$$
\begin{align}
f_t &= \sigma(W_f \cdot [h_{t-1}, x_t] + b_f) \\
i_t &= \sigma(W_i \cdot [h_{t-1}, x_t] + b_i) \\
\tilde{C}_t &= \tanh(W_C \cdot [h_{t-1}, x_t] + b_C) \\
C_t &= f_t * C_{t-1} + i_t * \tilde{C}_t \\
o_t &= \sigma(W_o \cdot [h_{t-1}, x_t] + b_o) \\
h_t &= o_t * \tanh(C_t)
\end{align}
$$

### 反向传播
$$
\frac{\partial \mathcal{L}}{\partial W^{(l)}} = \frac{\partial \mathcal{L}}{\partial z^{(l+1)}} \frac{\partial z^{(l+1)}}{\partial a^{(l)}} \frac{\partial a^{(l)}}{\partial z^{(l)}} \frac{\partial z^{(l)}}{\partial W^{(l)}}
$$

## 公式编号测试

重要的欧拉恒等式：
$$
e^{i\pi} + 1 = 0 \tag{1}
$$

薛定谔方程：
$$
i\hbar\frac{\partial}{\partial t}\Psi(\mathbf{r},t) = \hat{H}\Psi(\mathbf{r},t) \tag{2}
$$

## 结论

以上测试涵盖了：
- ✅ 行内公式渲染
- ✅ 块级公式渲染  
- ✅ 复杂数学表达式
- ✅ 多行公式对齐
- ✅ 矩阵和向量表示
- ✅ 分段函数
- ✅ 积分和求和符号
- ✅ 希腊字母和特殊符号

如果所有公式都能正确显示，说明 KaTeX 集成成功！