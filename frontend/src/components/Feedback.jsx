/**
 * Inline feedback / alert component.
 * type: 'success' | 'error' | 'warning'
 */
export default function Feedback({ message, type = 'success' }) {
  if (!message) return null;
  return <div className={`feedback feedback-${type}`}>{message}</div>;
}
