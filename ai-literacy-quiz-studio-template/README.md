# AI 리터러시 측정 퀴즈

이 폴더는 GitHub Pages에 바로 올릴 수 있는 배포용 파일입니다.

## GitHub Pages 배포 방법

1. GitHub에서 새 저장소를 만듭니다.
2. 이 폴더 안의 파일 전체를 저장소 루트에 업로드합니다.
3. 저장소의 `Settings`로 이동합니다.
4. `Pages` 메뉴를 엽니다.
5. `Build and deployment`에서 `Deploy from a branch`를 선택합니다.
6. Branch는 `main`, folder는 `/root`를 선택하고 저장합니다.
7. 몇 분 뒤 `https://아이디.github.io/저장소이름/` 주소로 접속합니다.

## 수정할 파일

- 퀴즈 수정: `src/data/quizData.json`
- 설문 수정: `src/data/surveyData.json`
- 제목, 색상, 영상 경로 수정: `src/data/themeConfig.json`

## 사전 영상

현재 영상 경로는 다음으로 설정되어 있습니다.

```json
"url": "./assets/videos/ai-literacy-4-superpowers.mp4"
```

GitHub Pages에서는 `/assets/...`가 아니라 `./assets/...`처럼 상대 경로를 쓰는 것이 안전합니다.
