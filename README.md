# B2B Client Work Management System

거래처 중심 반복 업무 관리 시스템입니다. 외부 라이브러리 없이 순수 HTML5, CSS3, Vanilla JavaScript만으로 동작합니다.

## 주요 기능

- 거래처, 반복 업무 템플릿, 업무 목록 샘플 데이터 자동 생성
- LocalStorage 기반 데이터 저장
- 업무 완료 처리 모달
- 완료 상세 기록 저장
  - 실제완료일
  - 완료내용
  - 실행메모
- 조회/출력 테이블
- 인쇄
- UTF-8 BOM 포함 CSV 다운로드
- 사용자 입력값 `textContent` 렌더링을 통한 XSS 방어

## 실행 방법

브라우저에서 `index.html` 파일을 직접 열면 실행됩니다.

별도 설치, 빌드, 개발 서버가 필요하지 않습니다.

## 데이터 저장소

브라우저 LocalStorage에 아래 key로 저장됩니다.

```text
sme_b2b_system_data
```

저장 구조는 다음과 같습니다.

```json
{
  "clients": [],
  "templates": [],
  "tasks": []
}
```

## 구성 파일

- `index.html`
- `style.css`
- `app.js`

## 기술 조건

- React 미사용
- jQuery 미사용
- Tailwind CSS 미사용
- 외부 라이브러리 미사용
