import PopupChat from '@/lib/rag/PopupChat';

export default async function PopupChatPage({
  params,
}: {
  params: Promise<{ categoryId: string }>;
}) {
  const { categoryId } = await params;
  return <PopupChat categoryId={categoryId} />;
}
