export default function Banner({ type, message }: { type: 'error' | 'success'; message: string }) {
  if (!message) return null;
  return <div className={`banner banner-${type}`}>{message}</div>;
}
