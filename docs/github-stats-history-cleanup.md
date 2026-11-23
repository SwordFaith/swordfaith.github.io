# GitHub Stats 历史清理操作手册

本文提供人工执行的安全命令模板，用于移除历史上的 GitHub stats 自动提交，同时保留人工提交和最终文件内容。本文档的添加不代表已经执行过清理；不要在 CI 中运行这些命令。

清理会重写已发布历史。开始前必须通知协作者，暂停其他推送，并确认分支保护、备份和恢复方案。优先使用交互式 rebase，不使用 `filter-branch` 或 `filter-repo`，避免按路径误删人工修改。

## 识别规则

只有同时满足以下条件的提交才进入候选列表：

- 作者为 `GitHub Action <action@github.com>`。
- 标题以 `📊 Update GitHub stats data - ` 开头。
- 非 merge commit，且只修改 `src/data/github-stats.json`。

作者或标题相似但不能完全匹配的提交一律保留。候选列表生成后仍需逐条人工审阅。

## 1. 冻结写入并协调 worktree

在主检出目录执行。全程将 `origin/main` 替换为实际远端和目标分支（如不同）。

```sh
cd /path/to/swordfaith.github.io
git status --short --branch
git remote -v
git worktree list --porcelain
git fetch origin --prune
git switch main
git merge --ff-only origin/main
git status --short
```

只有最后一个命令无输出时才能继续。对每个附加 worktree 逐一检查并暂停其中的工作：

```sh
git -C /absolute/path/to/other-worktree status --short --branch
```

不要在其他 worktree 中自动 stash、reset 或删除文件。确认目标分支没有被其他 worktree 检出用于重写，并约定清理期间不要推送。

## 2. 创建离线备份和固定范围

以下变量需要在同一个 shell 中保留。备份目录必须位于仓库外，并保留到远端和协作者环境都验证完成。

```sh
REMOTE=origin
TARGET_BRANCH=main
RUN_ID=$(date -u +%Y%m%dT%H%M%SZ)
REPO_ROOT=$(git rev-parse --show-toplevel)
END_COMMIT=$(git rev-parse "$REMOTE/$TARGET_BRANCH")
BACKUP_DIR="$HOME/swordfaith-blog-history-backup-$RUN_ID"
BACKUP_BRANCH="backup/github-stats-before-cleanup-$RUN_ID"
CLEANUP_WORKTREE="/tmp/swordfaith-blog-history-cleanup-$RUN_ID"
CLEANUP_BRANCH="github-stats-history-cleanup-$RUN_ID"
AUTO_LIST="$BACKUP_DIR/auto-commits.txt"
PRESERVED_METADATA="$BACKUP_DIR/preserved-metadata-before.txt"

mkdir -p "$BACKUP_DIR"
git branch "$BACKUP_BRANCH" "$END_COMMIT"
git show-ref > "$BACKUP_DIR/refs-before-cleanup.txt"
git bundle create "$BACKUP_DIR/repository-before-cleanup.bundle" --all
git bundle verify "$BACKUP_DIR/repository-before-cleanup.bundle"
git show "$END_COMMIT:src/data/github-stats.json" > "$BACKUP_DIR/github-stats-at-end.json"
printf 'End commit: %s\nBackup branch: %s\n' "$END_COMMIT" "$BACKUP_BRANCH"
```

确认 bundle 校验成功，并单独记录 `END_COMMIT` 和 `BACKUP_BRANCH`。`END_COMMIT` 是清理前的远端尖端，也是后续 `--force-with-lease` 的预期值。

## 3. 生成并审阅自动提交列表

按完整作者、标题和修改路径生成候选，不仅凭标题批量删除：

```sh
git rev-list --no-merges --reverse "$END_COMMIT" |
while IFS= read -r commit; do
  author_name=$(git show -s --format='%an' "$commit")
  author_email=$(git show -s --format='%ae' "$commit")
  subject=$(git show -s --format='%s' "$commit")
  paths=$(git diff-tree --no-commit-id --name-only -r "$commit")

  case "$subject" in
    "📊 Update GitHub stats data - "*) subject_matches=true ;;
    *) subject_matches=false ;;
  esac

  if [ "$author_name" = "GitHub Action" ] \
    && [ "$author_email" = "action@github.com" ] \
    && [ "$subject_matches" = true ] \
    && [ "$paths" = "src/data/github-stats.json" ]; then
    printf '%s\n' "$commit"
  fi
done > "$AUTO_LIST"

wc -l "$AUTO_LIST"
while IFS= read -r commit; do
  git show --stat --format=fuller "$commit"
done < "$AUTO_LIST"
```

逐条确认候选确为自动提交。若列表为空、包含人工提交，或存在无法解释的额外文件，立即停止；不要扩大匹配规则。将第一个候选的父提交设为 rebase 基点，因此第一个候选不能是根提交：

```sh
FIRST_AUTO=$(sed -n '1p' "$AUTO_LIST")
test -n "$FIRST_AUTO"
BASE_COMMIT=$(git rev-parse "$FIRST_AUTO^")
git merge-base --is-ancestor "$BASE_COMMIT" "$END_COMMIT"
printf 'Rebase base: %s\n' "$BASE_COMMIT"
```

保存清理范围内所有非候选提交的作者和标题，供重写后核对：

```sh
git rev-list --reverse "$BASE_COMMIT..$END_COMMIT" |
while IFS= read -r commit; do
  if ! grep -qxF "$commit" "$AUTO_LIST"; then
    git show -s --format='%an%x09%ae%x09%s' "$commit"
  fi
done | sort > "$PRESERVED_METADATA"

git log --oneline --decorate "$BASE_COMMIT..$END_COMMIT"
```

如果只想清理近期区间，不要用上面的全历史列表直接操作；重新指定一个人工确认的 `BASE_COMMIT`，并在该区间内重新生成和审阅两个列表。

## 4. 在独立 worktree 中交互式清理

创建专用 worktree，避免改变主检出目录或其他任务的分支：

```sh
git worktree add -b "$CLEANUP_BRANCH" "$CLEANUP_WORKTREE" "$END_COMMIT"
git -C "$CLEANUP_WORKTREE" status --short --branch
git -C "$CLEANUP_WORKTREE" rebase -i --rebase-merges "$BASE_COMMIT"
```

在编辑器中，只删除哈希与 `AUTO_LIST` 完全一致的自动提交对应的 `pick` 行。保留所有人工 `pick` 行，以及 `--rebase-merges` 生成的 `label`、`reset` 和 `merge` 指令。保存前再次核对，不要按标题模糊删除。

发生冲突时，先检查并保留人工修改；无法确认就中止，不要用批量 `ours` 或 `theirs` 掩盖冲突：

```sh
git -C "$CLEANUP_WORKTREE" status
git -C "$CLEANUP_WORKTREE" diff
# 无法安全解决时执行：
git -C "$CLEANUP_WORKTREE" rebase --abort
```

rebase 完成后，先核对人工提交元数据。`diff` 应当无输出；有差异则停止并查明原因：

```sh
git -C "$CLEANUP_WORKTREE" log --reverse \
  --format='%an%x09%ae%x09%s' "$BASE_COMMIT..HEAD" \
  | sort > "$BACKUP_DIR/preserved-metadata-after.txt"
diff -u "$PRESERVED_METADATA" "$BACKUP_DIR/preserved-metadata-after.txt"
```

确认候选自动提交不再从清理分支可达；以下循环应当无输出：

```sh
while IFS= read -r commit; do
  if git -C "$CLEANUP_WORKTREE" merge-base --is-ancestor "$commit" HEAD; then
    printf 'Automatic commit still reachable: %s\n' "$commit"
  fi
done < "$AUTO_LIST"
```

删除自动提交可能同时移除最终 stats 快照。先确认除该文件外最终树完全一致；此命令应返回 0：

```sh
git -C "$CLEANUP_WORKTREE" diff --exit-code "$END_COMMIT" HEAD \
  -- . ':(exclude)src/data/github-stats.json'
git -C "$CLEANUP_WORKTREE" diff --name-only "$END_COMMIT" HEAD
```

只有第二个命令不输出其他文件时，才恢复清理前的最终 stats 快照。若恢复快照产生差异，用一个明确的人工提交保存它：

```sh
git -C "$CLEANUP_WORKTREE" restore --source="$END_COMMIT" -- src/data/github-stats.json
git -C "$CLEANUP_WORKTREE" add src/data/github-stats.json
if ! git -C "$CLEANUP_WORKTREE" diff --cached --quiet; then
  git -C "$CLEANUP_WORKTREE" commit -m "chore: preserve GitHub stats snapshot"
fi

git -C "$CLEANUP_WORKTREE" diff --exit-code "$END_COMMIT" HEAD
git -C "$CLEANUP_WORKTREE" status --short
```

最后两个命令应分别返回 0 且无输出，表示最终树与清理前一致、worktree 干净。推送前可在此独立 worktree 运行项目常规测试。

## 5. 使用精确 lease 发布

这是人工确认后的独立步骤，不要与 rebase 命令整块粘贴执行。先重新获取远端并核对人工提交、最终树和候选列表。若远端已移动，停止并从新提交重新评估，不能复用旧 lease：

```sh
git -C "$CLEANUP_WORKTREE" fetch "$REMOTE" "$TARGET_BRANCH"
git -C "$CLEANUP_WORKTREE" rev-parse "$REMOTE/$TARGET_BRANCH"
printf 'Expected remote commit: %s\n' "$END_COMMIT"
git -C "$CLEANUP_WORKTREE" log --oneline --decorate "$BASE_COMMIT..HEAD"
```

只有 `rev-parse` 与 `END_COMMIT` 完全相同，且协作者已确认，才使用以下模板。精确的 `--force-with-lease` 会在远端不再是清理前尖端时拒绝推送；不要改成 `--force`，不要绕过分支保护：

```sh
git -C "$CLEANUP_WORKTREE" push \
  --force-with-lease="refs/heads/$TARGET_BRANCH:$END_COMMIT" \
  "$REMOTE" "HEAD:refs/heads/$TARGET_BRANCH"
```

## 6. 更新其他检出并保留恢复点

发布成功后，先让所有协作者获取新历史。其他克隆最简单、安全的做法是重新克隆；已有本地分支需要先备份，再将人工提交 rebase 到新 `origin/main`。

主检出目录只有在干净且备份可用时，才可将旧 `main` 对齐到新远端：

```sh
cd "$REPO_ROOT"
git status --short
git fetch "$REMOTE" --prune
git switch "$TARGET_BRANCH"
git reset --hard "$REMOTE/$TARGET_BRANCH"
```

对每个附加 worktree 分别检查状态并协调其分支，不要批量 reset。确认不再需要清理 worktree 后，从主检出目录移除它：

```sh
cd "$REPO_ROOT"
git worktree remove "$CLEANUP_WORKTREE"
git worktree list
```

保留 `BACKUP_BRANCH`、refs 清单和 bundle。若发布前发现结果错误，可在专用 worktree 中回到 `END_COMMIT`；若已经发布，先协调所有协作者，再基于备份和精确 lease 制定恢复推送，不要直接强制覆盖。
