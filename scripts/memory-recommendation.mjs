export const recommendationReasonCodes = new Set([
  '포트폴리오 가치',
  '운영 내부 기록',
  '민감정보 위험',
  '반복 학습 가치',
]);

const internalOpsPattern = /(hermes|discord|watcher|memory|timer|notification|message|prefix|graphify|workflow|deploy|build|content:check|relay|github pages|pages)/iu;
const portfolioPattern = /(feature|system|architecture|unreal|game|camera|inventory|interaction|localization|mcp|ai|tool|plugin|refactor|component|blueprint|animation|combat|ui|save|steam)/iu;
const learningPattern = /(study|learn|note|docs|experiment|prototype|research|analysis|troubleshoot|fix|debug|test)/iu;

export function summarizeCommitSubjects(commits = [], limit = 6) {
  return commits
    .map((commit) => String(commit.subject ?? '').trim())
    .filter(Boolean)
    .slice(0, limit);
}

export function summarizeChangedFiles(commits = [], limit = 12) {
  const files = [];
  for (const commit of commits) {
    for (const file of commit.files ?? []) {
      const value = String(file ?? '').trim();
      if (value && !files.includes(value)) files.push(value);
      if (files.length >= limit) return files;
    }
  }
  return files;
}

export function summarizeDiffStats(commits = [], limit = 6) {
  return commits
    .map((commit) => String(commit.stat ?? '').split(/\r?\n/u).map((line) => line.trim()).filter(Boolean).at(-1) ?? '')
    .filter(Boolean)
    .slice(0, limit);
}

export function recommendMemoryAction({
  sourceRepo = '',
  sourceVisibility = 'unknown',
  risk = 'unknown',
  blockers = [],
  commits = [],
  subjects = summarizeCommitSubjects(commits),
  files = summarizeChangedFiles(commits),
} = {}) {
  const text = [
    sourceRepo,
    sourceVisibility,
    risk,
    ...subjects,
    ...files,
  ].join(' ').toLowerCase();

  if (sourceVisibility === 'private' || sourceVisibility === 'internal' || risk !== 'low' || blockers.length > 0) {
    return {
      category: 'risk-blocked',
      action: 'deny',
      label: '거절 권장',
      reason_code: '민감정보 위험',
      reason: '비공개 저장소, 민감정보, 로컬 경로, 비공개 링크 등 공개 차단 가능성이 있어 공개 글로 승격하지 않는 것이 안전합니다.',
    };
  }

  if (/kitchengun\/wiki/iu.test(text) && internalOpsPattern.test(text)) {
    return {
      category: 'internal-ops',
      action: 'deny',
      label: '거절 권장',
      reason_code: '운영 내부 기록',
      reason: '위키/Hermes 운영 자동화 개선 커밋이라 포트폴리오나 공개 블로그 글로 남길 가치가 낮습니다.',
    };
  }

  if (portfolioPattern.test(text)) {
    return {
      category: 'portfolio-worthy',
      action: 'review',
      label: '승인 고려',
      reason_code: '포트폴리오 가치',
      reason: '프로젝트 구현 방식, 아키텍처, 게임 시스템, AI/tooling 경험으로 공개 포트폴리오에 재사용할 가능성이 있습니다.',
    };
  }

  if (learningPattern.test(text)) {
    return {
      category: 'needs-review',
      action: 'review',
      label: '확인 필요',
      reason_code: '반복 학습 가치',
      reason: '반복해서 참고할 수 있는 학습/문제해결 기록일 수 있지만, 공개 가치가 커밋 제목만으로 확실하지 않습니다.',
    };
  }

  return {
    category: 'needs-review',
    action: 'review',
    label: '확인 필요',
    reason_code: '반복 학습 가치',
    reason: '커밋 제목만으로 공개 가치가 확실하지 않습니다. 후보 내용을 먼저 확인해야 합니다.',
  };
}
