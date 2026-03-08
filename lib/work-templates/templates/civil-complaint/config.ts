import { TemplateConfig } from '../../types';

export const civilComplaintConfig: TemplateConfig = {
  id: 'civil-complaint',
  name: '국민신문고',
  icon: '🏛️',
  description: '국민신문고 민원에 대한 공식 답변서를 자동으로 작성합니다',
  category: '민원',
  apiPath: '/api/work-templates/civil-complaint',
  fields: [
    {
      key: 'category',
      label: '민원 분류',
      type: 'select',
      required: true,
      options: [
        { value: '생활불편', label: '생활불편' },
        { value: '행정서비스', label: '행정서비스' },
        { value: '건축/토지', label: '건축/토지' },
        { value: '교통', label: '교통' },
        { value: '환경', label: '환경' },
        { value: '복지', label: '복지' },
        { value: '기타', label: '기타' },
      ],
    },
    {
      key: 'complaintContent',
      label: '민원 내용',
      type: 'textarea',
      placeholder: '민원인이 제출한 내용을 입력하세요...',
      required: true,
      rows: 6,
    },
    {
      key: 'responsePoints',
      label: '답변 핵심 내용',
      type: 'textarea',
      placeholder: '답변에 포함할 핵심 사항을 입력하세요...',
      required: true,
      rows: 4,
    },
    {
      key: 'department',
      label: '담당 부서',
      type: 'text',
      placeholder: '예: 도시과, 민원봉사과',
    },
  ],
};
