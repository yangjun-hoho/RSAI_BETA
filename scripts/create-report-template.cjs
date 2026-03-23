/**
 * 기존 report-template.hwpx에서 헤더는 유지하고
 * 본문 내용을 CONTENT_ANCHOR 단락으로 교체하여
 * templates/report_basic/template.hwpx 생성
 */

const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const sourcePath = path.join(projectRoot, 'public', 'work-support-template', 'report-template.hwpx');
const destPath = path.join(projectRoot, 'templates', 'report_basic', 'template.hwpx');

async function main() {
  if (!fs.existsSync(sourcePath)) {
    console.error('원본 템플릿을 찾을 수 없습니다:', sourcePath);
    process.exit(1);
  }

  const buffer = fs.readFileSync(sourcePath);
  const zip = await JSZip.loadAsync(buffer);

  const section0File = zip.file('Contents/section0.xml');
  if (!section0File) {
    console.error('Contents/section0.xml 없음');
    process.exit(1);
  }

  const xml = await section0File.async('string');

  // 헤더 블록 추출: <hs:sec ...> 오프닝 + 첫 번째 top-level <hp:p> (헤더 테이블)
  // summaryParaMarker 이전까지가 헤더
  const summaryParaMarker = '<hp:p id="0" paraPrIDRef="29"';
  const summaryParaIdx = xml.indexOf(summaryParaMarker);

  if (summaryParaIdx === -1) {
    console.error('헤더 경계를 찾을 수 없습니다. 템플릿 구조를 확인하세요.');
    process.exit(1);
  }

  const headerPart = xml.substring(0, summaryParaIdx);

  // CONTENT_ANCHOR 단락 생성
  const anchorPara =
    '<hp:p id="0" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">' +
    '<hp:run charPrIDRef="0"><hp:t>CONTENT_ANCHOR</hp:t></hp:run>' +
    '<hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="300" horzpos="0" horzsize="48328" flags="0"/></hp:linesegarray>' +
    '</hp:p>';

  const newXml = headerPart + anchorPara + '</hs:sec>';

  zip.file('Contents/section0.xml', newXml);

  const output = await zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/hwp+zip' });

  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, output);

  console.log('✓ 템플릿 생성 완료:', destPath);
  console.log('  헤더 유지 + CONTENT_ANCHOR 삽입');
}

main().catch(err => {
  console.error('오류:', err);
  process.exit(1);
});
